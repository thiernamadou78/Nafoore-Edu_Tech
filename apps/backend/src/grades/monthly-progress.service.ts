import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { resolvePortalUrl } from '../email/portal-url.util';
import { renderNoticeEmail } from '../email/templates/notice.template';
import { GradesService } from './grades.service';

// Le point d'etape part 8 jours avant la fin du mois : assez tot pour que les
// profs completent leurs evaluations, assez tard pour que la famille voie une
// progression deja parlante.
const DAYS_BEFORE_MONTH_END = 8;
const SENT_KEY = 'monthlyProgressMailSent';

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

@Injectable()
export class MonthlyProgressService {
  private readonly logger = new Logger(MonthlyProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly grades: GradesService,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'Europe/Paris' })
  async handleDaily() {
    await this.sendIfDue(new Date());
  }

  // Idempotent : une fois envoye pour un mois, ne renvoie plus. Le mois est
  // marque AVANT l'envoi pour qu'un redemarrage ou un second tick ne double
  // jamais les emails ; le rattrapage (>= J-8) couvre un serveur eteint ce jour-la.
  async sendIfDue(now: Date): Promise<{ sent: boolean; teachers: number; families: number }> {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = lastDay - now.getDate();
    const current = monthKey(now);
    if (daysLeft > DAYS_BEFORE_MONTH_END) return { sent: false, teachers: 0, families: 0 };

    const already = await this.prisma.siteSetting.findUnique({ where: { key: SENT_KEY } });
    if (already?.value === current) return { sent: false, teachers: 0, families: 0 };
    await this.prisma.siteSetting.upsert({
      where: { key: SENT_KEY },
      create: { key: SENT_KEY, value: current },
      update: { value: current },
    });

    const teachers = await this.sendTeacherReminders(now);
    const families = await this.sendFamilyRecaps();
    this.logger.log(
      `Point d'étape mensuel ${current} : ${teachers} enseignant(s), ${families} famille(s)`,
    );
    return { sent: true, teachers, families };
  }

  private async sendTeacherReminders(now: Date): Promise<number> {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const assignments = await this.prisma.studentTeacher.findMany({
      where: {
        subject: { not: null },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        teacher: { account: { isNot: null } },
      },
      include: {
        student: { select: { name: true } },
        teacher: { select: { id: true, name: true, gender: true, account: { select: { email: true } } } },
      },
    });

    const linesByTeacher = new Map<
      string,
      { teacher: (typeof assignments)[number]['teacher']; lines: string[] }
    >();
    for (const assignment of assignments) {
      const subject = assignment.subject as string;
      const [baseline, evaluatedThisMonth] = await Promise.all([
        this.prisma.grade.count({
          where: { studentId: assignment.studentId, subject, kind: 'depart' },
        }),
        this.prisma.grade.count({
          where: {
            studentId: assignment.studentId,
            subject,
            kind: 'suivi',
            evaluatedAt: { gte: startOfMonth },
          },
        }),
      ]);
      if (baseline > 0 && evaluatedThisMonth > 0) continue;

      const entry = linesByTeacher.get(assignment.teacherId) ?? {
        teacher: assignment.teacher,
        lines: [],
      };
      entry.lines.push(
        baseline === 0
          ? `${assignment.student.name} — ${subject} : notes de départ à saisir`
          : `${assignment.student.name} — ${subject} : aucune évaluation ce mois-ci`,
      );
      linesByTeacher.set(assignment.teacherId, entry);
    }

    let sent = 0;
    for (const { teacher, lines } of linesByTeacher.values()) {
      if (!teacher.account?.email) continue;
      this.sendNotice({
        to: teacher.account.email,
        subject: 'Nafoore Education — Pensez à saisir les notes du mois',
        fullName: teacher.name,
        gender: teacher.gender,
        label: 'Suivi du mois',
        paragraphs: [
          `Il reste ${DAYS_BEFORE_MONTH_END} jours avant la fin du mois : pensez à saisir les évaluations relevées sur Pronote pour que les familles voient la progression de leurs enfants.`,
          ...lines.map((line) => `• ${line}`),
        ],
        ctaUrl: resolvePortalUrl('teacher'),
      });
      sent += 1;
    }
    return sent;
  }

  private async sendFamilyRecaps(): Promise<number> {
    const students = await this.prisma.student.findMany({
      where: { grades: { some: {} }, parentLead: { portalAccount: { isNot: null } } },
      select: {
        id: true,
        name: true,
        parentLead: {
          select: {
            id: true,
            name: true,
            gender: true,
            portalAccount: { select: { email: true, fullName: true } },
          },
        },
      },
    });

    const byFamily = new Map<
      string,
      { lead: NonNullable<(typeof students)[number]['parentLead']>; blocks: string[] }
    >();
    for (const student of students) {
      const lead = student.parentLead;
      if (!lead?.portalAccount) continue;
      const progress = await this.grades.computeProgress(student.id);
      const rows = progress.subjects.filter((s) => s.baselineAverage !== null);
      if (rows.length === 0) continue;

      const parts = rows.map((s) =>
        s.latestAverage === null
          ? `${s.subject} : départ ${s.baselineAverage}/20, en attente de la première évaluation`
          : `${s.subject} : ${s.baselineAverage} → ${s.latestAverage}/20 (${(s.delta as number) >= 0 ? '+' : ''}${s.delta})`,
      );
      const overall = progress.overall
        ? ` Moyenne générale : ${progress.overall.baselineAverage} → ${progress.overall.latestAverage}/20.`
        : '';
      const family = byFamily.get(lead.id) ?? { lead, blocks: [] };
      family.blocks.push(`${student.name} — ${parts.join(' ; ')}.${overall}`);
      byFamily.set(lead.id, family);
    }

    let sent = 0;
    for (const { lead, blocks } of byFamily.values()) {
      const portal = lead.portalAccount;
      if (!portal) continue;
      this.sendNotice({
        to: portal.email,
        subject: "Nafoore Education — Point d'étape sur la progression",
        fullName: portal.fullName,
        gender: lead.gender,
        label: "Point d'étape",
        paragraphs: [
          `Voici où en est la progression de vos enfants à quelques jours de la fin du mois (moyennes sur 20, notes relevées par l'enseignant sur Pronote) :`,
          ...blocks,
          'Le détail par matière est disponible dans votre espace famille.',
        ],
        ctaUrl: resolvePortalUrl('famille'),
        ctaLabel: 'Voir la progression →',
      });
      sent += 1;
    }
    return sent;
  }

  private sendNotice(input: {
    to: string;
    subject: string;
    fullName: string;
    gender?: string | null;
    label: string;
    paragraphs: string[];
    ctaUrl?: string;
    ctaLabel?: string;
  }) {
    this.emailService
      .send({
        to: input.to,
        subject: input.subject,
        html: renderNoticeEmail({
          gender: input.gender,
          fullName: input.fullName,
          label: input.label,
          paragraphs: input.paragraphs,
          ctaUrl: input.ctaUrl,
          ctaLabel: input.ctaLabel,
        }),
      })
      .catch((error) =>
        this.logger.error(
          `Échec d'envoi de l'email "${input.subject}" à ${input.to}`,
          error instanceof Error ? error.stack : undefined,
        ),
      );
  }
}
