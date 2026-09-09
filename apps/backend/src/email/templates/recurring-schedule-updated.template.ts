const DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
};

export interface RecurringScheduleUpdatedEmailInput {
  studentName: string;
  teacherName: string;
  frequency: number;
  slots: { dayOfWeek: number; time: string }[];
  portalUrl: string;
}

export function renderRecurringScheduleUpdatedEmail({
  studentName,
  teacherName,
  frequency,
  slots,
  portalUrl,
}: RecurringScheduleUpdatedEmailInput): string {
  const sortedSlots = [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const slotsHtml = sortedSlots
    .map(
      (slot) => `
                    <li style="margin:0 0 6px 0;">
                      <strong>${escapeHtml(DAY_LABELS[slot.dayOfWeek] ?? String(slot.dayOfWeek))}</strong> à ${escapeHtml(slot.time)}
                    </li>`,
    )
    .join('');

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Planning mis à jour — Nafoore Education</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f3ef;font-family:Georgia,'Playfair Display',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,138,0.08);">
            <tr>
              <td style="background-color:#1E3A8A;padding:28px 32px;">
                <span style="font-family:Georgia,'Playfair Display',serif;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.02em;">Nafoore Education</span>
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#EAB308,#facc15,#EAB308);"></td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px 32px;">
                <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#EAB308;">Planning</p>
                <h1 style="margin:0 0 16px 0;font-family:Georgia,'Playfair Display',serif;font-size:24px;line-height:1.3;color:#1E3A8A;">
                  Le planning de ${escapeHtml(studentName)} a été mis à jour
                </h1>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
                  ${escapeHtml(teacherName)} a défini un rythme de <strong>${frequency} séance${frequency > 1 ? 's' : ''} par semaine</strong> pour ${escapeHtml(studentName)} :
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;border-radius:12px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <ul style="margin:0;padding-left:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1E3A8A;">${slotsHtml}
                      </ul>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6b7280;">
                  Les prochaines séances sont automatiquement planifiées sur ce rythme. Vous pouvez consulter le programme complet et l'historique des séances depuis votre espace famille.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background-color:#EAB308;">
                      <a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1E3A8A;text-decoration:none;border-radius:999px;">
                        Voir le programme →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 28px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  Pour toute question sur ce planning, contactez l'enseignant directement via la messagerie de votre espace famille.
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
