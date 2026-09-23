import { Injectable, NotFoundException, SetMetadata } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedAdmin } from './supabase-auth.guard';

// Elements soumis a la zone d'un delegue. Les 4 premiers ont une adresse ;
// les autres suivent l'eleve, l'enseignant ou la famille auxquels ils
// sont rattaches.
export type ZoneKind =
  | 'lead'
  | 'student'
  | 'teacher'
  | 'application'
  | 'teacherRequest'
  | 'renewal'
  | 'thread'
  | 'message'
  | 'supportTicket';

export const ZONE_PARAMS_KEY = 'zoneParams';

// Sur un controleur : { nomDuParametre: type }. Le RolesGuard verifie que
// l'element vise par l'URL est dans la zone du delegue (sinon 404).
export const ZoneParams = (params: Record<string, ZoneKind>) =>
  SetMetadata(ZONE_PARAMS_KEY, params);

export interface ZoneScope {
  leadIds: string[];
  studentIds: string[];
  teacherIds: string[];
  applicationIds: string[];
}

// Distance en km (formule de haversine) entre la colonne (lat, lng) d'une
// table et le centre de la zone.
function distanceSql(table: string, lat: number, lng: number) {
  return Prisma.sql`6371 * 2 * ASIN(SQRT(
    POWER(SIN(RADIANS(${Prisma.raw(`${table}.latitude`)} - ${lat}) / 2), 2) +
    COS(RADIANS(${lat})) * COS(RADIANS(${Prisma.raw(`${table}.latitude`)})) *
    POWER(SIN(RADIANS(${Prisma.raw(`${table}.longitude`)} - ${lng}) / 2), 2)
  ))`;
}

@Injectable()
export class ZoneService {
  // Calcule une seule fois par requete (l'objet admin est propre a la requete).
  private readonly cache = new WeakMap<AuthenticatedAdmin, Promise<ZoneScope | null>>();

  constructor(private readonly prisma: PrismaService) {}

  // null = aucune restriction (Super Admin, ou admin sans zone definie).
  scope(admin: AuthenticatedAdmin): Promise<ZoneScope | null> {
    if (
      admin.roleNames.includes('super_admin') ||
      admin.zoneLatitude == null ||
      admin.zoneLongitude == null ||
      !admin.zoneRadiusKm
    ) {
      return Promise.resolve(null);
    }
    let pending = this.cache.get(admin);
    if (!pending) {
      pending = this.computeScope(admin);
      this.cache.set(admin, pending);
    }
    return pending;
  }

  private async computeScope(admin: AuthenticatedAdmin): Promise<ZoneScope> {
    const lat = admin.zoneLatitude as number;
    const lng = admin.zoneLongitude as number;
    const radius = admin.zoneRadiusKm as number;
    const inZone = (table: string) =>
      Prisma.sql`(${Prisma.raw(`${table}.latitude`)} IS NOT NULL AND ${distanceSql(table, lat, lng)} <= ${radius})`;

    const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

    // Familles : dans le cercle, ou assignees au delegue (ex. une famille
    // qu'il vient de creer et dont l'adresse n'est pas encore localisee).
    const leadIds = ids(
      await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT l.id::text AS id FROM leads l WHERE ${inZone('l')} OR l.assigned_to::text = ${admin.id}`,
    );
    // Candidatures : dans le cercle.
    const applicationIds = ids(
      await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT a.id::text AS id FROM teacher_applications a WHERE ${inZone('a')}`,
    );
    // Eleves : dans le cercle, ou rattaches a une famille visible.
    const studentIds = ids(
      await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT s.id::text AS id FROM students s
        WHERE ${inZone('s')}
           OR s.parent_lead_id::text = ANY(${leadIds}::text[])`,
    );
    // Enseignants : dans le cercle, ou issus d'une candidature visible.
    const teacherIds = ids(
      await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT t.id::text AS id FROM teachers t
        WHERE ${inZone('t')}
           OR t.id::text IN (
             SELECT a.created_teacher_id::text FROM teacher_applications a
             WHERE a.created_teacher_id IS NOT NULL AND a.id::text = ANY(${applicationIds}::text[])
           )`,
    );

    return { leadIds, studentIds, teacherIds, applicationIds };
  }

  // Filtre Prisma a ajouter (AND) aux requetes de liste. undefined = pas de
  // restriction.
  async where(admin: AuthenticatedAdmin, kind: ZoneKind): Promise<object | undefined> {
    const scope = await this.scope(admin);
    if (!scope) return undefined;
    const { leadIds, studentIds, teacherIds, applicationIds } = scope;
    switch (kind) {
      case 'lead':
        return { id: { in: leadIds } };
      case 'student':
        return { id: { in: studentIds } };
      case 'teacher':
        return { id: { in: teacherIds } };
      case 'application':
        return { id: { in: applicationIds } };
      case 'teacherRequest':
        return { studentId: { in: studentIds } };
      case 'renewal':
        return { studentTeacher: { studentId: { in: studentIds } } };
      case 'thread':
        return {
          OR: [
            { leadId: { in: leadIds } },
            { leadId: null, teacherId: { in: teacherIds } },
          ],
        };
      case 'message':
        return {
          thread: {
            OR: [
              { leadId: { in: leadIds } },
              { leadId: null, teacherId: { in: teacherIds } },
            ],
          },
        };
      case 'supportTicket':
        return { teacherId: { in: teacherIds } };
    }
  }

  // 404 si l'element n'est pas dans la zone (on ne revele pas son existence).
  async assertVisible(admin: AuthenticatedAdmin, kind: ZoneKind, id: string) {
    const zoneWhere = await this.where(admin, kind);
    if (!zoneWhere) return;
    const where = { AND: [{ id }, zoneWhere] };
    const delegates: Record<ZoneKind, { count(args: { where: object }): Promise<number> }> = {
      lead: this.prisma.lead,
      student: this.prisma.student,
      teacher: this.prisma.teacher,
      application: this.prisma.teacherApplication,
      teacherRequest: this.prisma.teacherRequest,
      renewal: this.prisma.periodRenewal,
      thread: this.prisma.messageThread,
      message: this.prisma.message,
      supportTicket: this.prisma.supportTicket,
    };
    const count = await delegates[kind].count({ where });
    if (count === 0) {
      throw new NotFoundException('Élément introuvable ou hors de votre zone');
    }
  }
}
