import { salutation } from '../salutation.util';

export interface SessionUpcomingEmailInput {
  gender?: string | null;
  recipientName: string;
  studentName: string;
  teacherName: string;
  subject: string | null;
  sessionDate: string;
  portalUrl: string;
}

function shell(title: string, heading: string, body: string, portalUrl: string): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} — Nafoore Education</title>
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
                <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#EAB308;">Rappel de séance</p>
                <h1 style="margin:0 0 16px 0;font-family:Georgia,'Playfair Display',serif;font-size:24px;line-height:1.3;color:#1E3A8A;">${heading}</h1>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">${body}</p>
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
                  Nafoore Education
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

export function renderSessionUpcomingTeacherEmail({
  gender,
  recipientName,
  studentName,
  subject,
  sessionDate,
  portalUrl,
}: SessionUpcomingEmailInput): string {
  const subjectLabel = subject ? ` de ${escapeHtml(subject)}` : '';
  return shell(
    'Séance à venir',
    `Bonjour ${escapeHtml(salutation(recipientName, gender))},`,
    `Vous avez une séance${subjectLabel} avec <strong>${escapeHtml(studentName)}</strong> prévue le
     <strong>${escapeHtml(sessionDate)}</strong>. Pensez à scanner le Pass QR à l'arrivée.`,
    portalUrl,
  );
}

export function renderSessionUpcomingFamilyEmail({
  gender,
  recipientName,
  studentName,
  teacherName,
  subject,
  sessionDate,
  portalUrl,
}: SessionUpcomingEmailInput): string {
  const subjectLabel = subject ? ` de ${escapeHtml(subject)}` : '';
  return shell(
    'Séance à venir',
    `Bonjour ${escapeHtml(salutation(recipientName, gender))},`,
    `Une séance${subjectLabel} avec <strong>${escapeHtml(teacherName)}</strong> est prévue pour
     <strong>${escapeHtml(studentName)}</strong> le <strong>${escapeHtml(sessionDate)}</strong>.`,
    portalUrl,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
