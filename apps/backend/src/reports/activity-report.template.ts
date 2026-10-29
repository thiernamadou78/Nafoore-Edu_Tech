import { formatInPlatformTz } from '../common/timezone';
import type { ActivityReportService } from './activity-report.service';
import { formatDuration } from './activity-report.service';

type Report = Awaited<ReturnType<ActivityReportService['build']>>;

const FONT = 'font-family:Arial,Helvetica,sans-serif;';
const NAVY = '#1E3A8A';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const day = (date: Date) => formatInPlatformTz(date, { day: 'numeric', month: 'long' });

// Evolution par rapport a la periode precedente. `lowerIsBetter` inverse les
// couleurs (annulations, comptes-rendus manquants).
function delta(value: number | null, previous: number | null, unit = '', lowerIsBetter = false) {
  if (value === null || previous === null) return '<span style="color:#9ca3af;">—</span>';
  const diff = Math.round((value - previous) * 10) / 10;
  if (diff === 0) return '<span style="color:#9ca3af;">= stable</span>';
  const good = lowerIsBetter ? diff < 0 : diff > 0;
  const color = good ? '#15803d' : '#b91c1c';
  const arrow = diff > 0 ? '▲' : '▼';
  return `<span style="color:${color};">${arrow} ${diff > 0 ? '+' : ''}${diff}${unit}</span>`;
}

function kpiCell(value: string, label: string, change: string) {
  return `<td width="33%" valign="top" style="padding:6px;">
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px 12px;">
        <div style="${FONT}font-size:20px;font-weight:bold;color:${NAVY};">${value}</div>
        <div style="${FONT}font-size:12px;color:#6b7280;margin-top:2px;">${label}</div>
        <div style="${FONT}font-size:12px;margin-top:6px;">${change}</div>
      </div>
    </td>`;
}

function section(title: string, body: string) {
  return `<tr><td style="padding:22px 32px 0 32px;">
      <h2 style="margin:0 0 10px 0;font-family:Georgia,'Playfair Display',serif;font-size:17px;color:${NAVY};border-bottom:2px solid #EAB308;padding-bottom:6px;">${escapeHtml(title)}</h2>
      ${body}
    </td></tr>`;
}

function list(items: string[], empty: string) {
  if (items.length === 0) return `<p style="margin:0;${FONT}font-size:13px;color:#9ca3af;">${escapeHtml(empty)}</p>`;
  return `<ul style="margin:0;padding-left:18px;${FONT}font-size:13px;line-height:1.6;color:#374151;">${items
    .map((i) => `<li style="margin:0 0 4px 0;">${i}</li>`)
    .join('')}</ul>`;
}

// Tableau "libelle / valeur" compact.
function facts(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${FONT}font-size:13px;color:#374151;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:5px 0;border-bottom:1px solid #f3f4f6;">${escapeHtml(label)}</td><td align="right" style="padding:5px 0;border-bottom:1px solid #f3f4f6;font-weight:bold;color:#111827;">${value}</td></tr>`,
    )
    .join('')}</table>`;
}

const b = (value: string) => `<b>${escapeHtml(value)}</b>`;
const hours = (minutes: number | null) => (minutes === null ? null : Math.round(minutes / 6) / 10);
const orDash = (value: number | null, unit = '') => (value === null ? '—' : `${value}${unit}`);

export function renderActivityReportEmail(report: Report, url: string): string {
  const { kpis, activity, quality, teachers, families, recruitment, reviews, progression } = report;
  const title = report.kind === 'weekly' ? 'Rapport hebdomadaire' : 'Rapport mensuel';
  const vs = report.kind === 'weekly' ? 'vs semaine précédente' : 'vs mois précédent';

  const kpiRows = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${kpiCell(formatDuration(kpis.minutes.value ?? 0), 'Heures pointées', delta(hours(kpis.minutes.value), hours(kpis.minutes.previous), ' h'))}
        ${kpiCell(String(kpis.done.value), 'Séances réalisées', delta(kpis.done.value, kpis.done.previous))}
        ${kpiCell(orDash(kpis.pointingRate.value, ' %'), 'Taux de pointage', delta(kpis.pointingRate.value, kpis.pointingRate.previous, ' pts'))}
      </tr>
      <tr>
        ${kpiCell(String(kpis.cancelled.value), 'Annulations', delta(kpis.cancelled.value, kpis.cancelled.previous, '', true))}
        ${kpiCell(String(kpis.missingReports.value), 'Comptes-rendus manquants', delta(kpis.missingReports.value, kpis.missingReports.previous, '', true))}
        ${kpiCell(String(kpis.newStudents.value), 'Nouveaux élèves', delta(kpis.newStudents.value, kpis.newStudents.previous))}
      </tr>
    </table>`;

  const activityBody = facts([
    ['Séances prévues', String(activity.planned)],
    ['Séances réalisées (pointées)', String(activity.done)],
    [`Annulations (dont tardives, moins de ${report.lateChangeHours} h avant)`, `${activity.cancelled} (${activity.lateCancelled})`],
    ['Séances décalées', String(activity.postponed)],
    ['Séances non données', String(activity.notHeld)],
    ['Heures pointées', formatDuration(activity.minutes)],
  ]);

  const qualityBody = facts([
    ['Taux de pointage', orDash(quality.pointingRate, ' %')],
    ['Séances jamais pointées', String(quality.neverPointed)],
    ['Départs non pointés', String(quality.openCheckouts)],
    ['Part des scans QR', orDash(quality.qrShare, ' %')],
    [`Arrivées en retard (+ de ${report.lateThresholdMinutes} min)`, String(quality.late)],
    ['Comptes-rendus manquants', String(quality.missingReports)],
    ['Délai moyen de rédaction du compte-rendu', quality.avgReportDelayHours === null ? '—' : `${quality.avgReportDelayHours} h`],
  ]);

  const teacherBody = `
      <p style="margin:0 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#111827;">Les plus actifs</p>
      ${list(
        teachers.top.map((t) => `${b(t.name)} — ${formatDuration(t.minutes)} (${t.sessions} séance${t.sessions > 1 ? 's' : ''})`),
        'Aucune séance pointée sur la période.',
      )}
      <p style="margin:14px 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#111827;">À surveiller</p>
      ${list(
        teachers.watch.map((t) => `${b(t.name)} — ${escapeHtml(t.reasons.join(', '))}`),
        'Aucun point de vigilance.',
      )}`;

  const familyBody = `
      <p style="margin:0 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#111827;">Heures consommées par famille</p>
      ${list(
        families.all.slice(0, 8).map((f) => `${b(f.name)} — ${formatDuration(f.minutes)}`),
        'Aucune heure consommée.',
      )}
      ${families.all.length > 8 ? `<p style="margin:4px 0 0 0;${FONT}font-size:12px;color:#6b7280;">… et ${families.all.length - 8} autre(s) : détail dans l'admin.</p>` : ''}
      <p style="margin:14px 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#111827;">Nouveaux élèves</p>
      ${list(families.newStudents.map((s) => escapeHtml(s.name)), 'Aucun nouvel élève.')}
      <p style="margin:14px 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#111827;">Accompagnements à renouveler (fin dans les 14 jours)</p>
      ${list(
        families.renewalsDue.map(
          (r) => `${b(r.studentName)} avec ${escapeHtml(r.teacherName)}${r.subject ? ` (${escapeHtml(r.subject)})` : ''} — fin le ${day(r.endsAt as Date)}`,
        ),
        'Aucun accompagnement ne se termine prochainement.',
      )}
      <p style="margin:14px 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#111827;">Élèves sans séance depuis 2 semaines</p>
      ${list(
        families.inactive.slice(0, 10).map(
          (s) => `${b(s.name)} — ${s.lastSession ? `dernière séance le ${day(s.lastSession)}` : 'aucune séance'}`,
        ),
        'Tous les élèves suivis ont eu une séance récemment.',
      )}`;

  const recruitmentBody = `${facts([
    ['Nouvelles demandes de familles (leads)', String(recruitment.newLeads)],
    ['Nouvelles candidatures enseignants', String(recruitment.newApplications)],
    ['Dossiers complétés à valider', String(recruitment.dossiersToValidate)],
  ])}
      <p style="margin:14px 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#111827;">Demandes de professeur en attente depuis plus de 7 jours</p>
      ${list(
        recruitment.pendingRequests.map((r) => `${b(r.studentName)} — ${escapeHtml(r.subject)} (${r.days} jours)`),
        'Aucune demande en souffrance.',
      )}`;

  const reviewBody = `${facts([
    ['Avis reçus', String(reviews.count)],
    ['Note moyenne', reviews.average === null ? '—' : `${reviews.average} / 5`],
  ])}
      ${reviews.low.length ? `<p style="margin:14px 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#111827;">Avis de 2/5 ou moins</p>` : ''}
      ${reviews.low.length ? list(reviews.low.map((r) => `${b(r.teacherName)} — ${r.rating}/5 par la famille de ${escapeHtml(r.studentName)}${r.comment ? ` : « ${escapeHtml(r.comment)} »` : ''}`), '') : ''}`;

  const progressionBody = `
      <p style="margin:0 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#15803d;">En progression</p>
      ${list(progression.up.map((p) => `${b(p.studentName)} — ${escapeHtml(p.subject)} : ${p.baseline} → ${p.latest} /20 (+${p.delta})`), 'Aucune nouvelle note en hausse.')}
      <p style="margin:14px 0 6px 0;${FONT}font-size:13px;font-weight:bold;color:#b91c1c;">En baisse</p>
      ${list(progression.down.map((p) => `${b(p.studentName)} — ${escapeHtml(p.subject)} : ${p.baseline} → ${p.latest} /20 (${p.delta})`), 'Aucune note en baisse.')}`;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} — Nafoore Education</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f3ef;font-family:Georgia,'Playfair Display',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,138,0.08);">
            <tr>
              <td style="background-color:${NAVY};padding:28px 32px;">
                <span style="font-family:Georgia,'Playfair Display',serif;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.02em;">Nafoore Education — Admin</span>
              </td>
            </tr>
            <tr><td style="height:4px;background:linear-gradient(90deg,#EAB308,#facc15,#EAB308);"></td></tr>
            <tr>
              <td style="padding:30px 32px 6px 32px;">
                <p style="margin:0 0 4px 0;${FONT}font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#EAB308;">${title}</p>
                <h1 style="margin:0 0 4px 0;font-family:Georgia,'Playfair Display',serif;font-size:22px;line-height:1.3;color:${NAVY};">${escapeHtml(report.label)}</h1>
                <p style="margin:0;${FONT}font-size:12px;color:#6b7280;">Évolutions ${vs} (${escapeHtml(report.previousLabel)}).</p>
              </td>
            </tr>
            <tr><td style="padding:12px 26px 0 26px;">${kpiRows}</td></tr>
            ${section('Activité', activityBody)}
            ${section('Qualité du suivi', qualityBody)}
            ${section('Enseignants', teacherBody)}
            ${section('Familles et élèves', familyBody)}
            ${section('Demandes et recrutement', recruitmentBody)}
            ${section('Avis des familles', reviewBody)}
            ${section('Progression des élèves', progressionBody)}
            <tr>
              <td style="padding:26px 32px 8px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                  <td style="border-radius:999px;background-color:#EAB308;">
                    <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 28px;${FONT}font-size:14px;font-weight:bold;color:${NAVY};text-decoration:none;border-radius:999px;">Voir le rapport détaillé →</a>
                  </td>
                </tr></table>
                ${report.kind === 'monthly' ? `<p style="margin:12px 0 0 0;${FONT}font-size:12px;color:#6b7280;">En pièce jointe : les heures du mois par enseignant et par famille (CSV, ouvrable dans Excel).</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;">
                <p style="margin:0;${FONT}font-size:12px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  Rapport automatique de la plateforme Nafoore Education, envoyé ${report.kind === 'weekly' ? 'chaque lundi' : 'le 1er de chaque mois'} à 7 h.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
