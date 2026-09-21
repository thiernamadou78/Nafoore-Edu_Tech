import { salutation } from '../salutation.util';

export interface TeacherProposedEmailInput {
  gender?: string | null;
  hourlyRate?: number | null;
  teacherName: string;
  studentName: string;
  subject: string;
  portalUrl: string;
}

export function renderTeacherProposedEmail({
  gender,
  hourlyRate,
  teacherName,
  studentName,
  subject,
  portalUrl,
}: TeacherProposedEmailInput): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Vous avez été proposé — Nafoore Education</title>
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
                <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#EAB308;">Nouvelle mise en relation</p>
                <h1 style="margin:0 0 16px 0;font-family:Georgia,'Playfair Display',serif;font-size:24px;line-height:1.3;color:#1E3A8A;">
                  Bonjour ${escapeHtml(salutation(teacherName, gender))},
                </h1>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
                  Vous avez été proposé pour donner des cours de <strong>${escapeHtml(subject)}</strong> à
                  <strong>${escapeHtml(studentName)}</strong>. ${hourlyRate ? `Le cours est fixé à <strong>${hourlyRate} €/h net</strong>. ` : ''}La famille va examiner votre profil et vous
                  recevrez une notification dès qu'elle aura répondu.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background-color:#EAB308;">
                      <a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1E3A8A;text-decoration:none;border-radius:999px;">
                        Voir mon espace →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 28px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  Pour toute question, contactez l'équipe Nafoore Education via votre espace enseignant.
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
