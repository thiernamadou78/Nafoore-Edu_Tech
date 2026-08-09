export interface MatchingProposalEmailInput {
  fullName: string;
  studentName: string;
  subject: string;
  teacherName: string;
  teacherSubjects: string[];
  teacherBio: string | null;
  teacherZone: string | null;
  teacherVerified: boolean;
  portalUrl: string;
}

export function renderMatchingProposalEmail({
  fullName,
  studentName,
  subject,
  teacherName,
  teacherSubjects,
  teacherBio,
  teacherZone,
  teacherVerified,
  portalUrl,
}: MatchingProposalEmailInput): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Un professeur vous est proposé — Nafoore</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f3ef;font-family:Georgia,'Playfair Display',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,58,138,0.08);">
            <tr>
              <td style="background-color:#1E3A8A;padding:28px 32px;">
                <span style="font-family:Georgia,'Playfair Display',serif;font-size:20px;font-weight:bold;color:#ffffff;letter-spacing:0.02em;">Nafoore</span>
              </td>
            </tr>
            <tr>
              <td style="height:4px;background:linear-gradient(90deg,#EAB308,#facc15,#EAB308);"></td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px 32px;">
                <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#EAB308;">Un professeur vous est proposé</p>
                <h1 style="margin:0 0 16px 0;font-family:Georgia,'Playfair Display',serif;font-size:24px;line-height:1.3;color:#1E3A8A;">
                  Bonjour ${escapeHtml(fullName)},
                </h1>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
                  Nafoore a trouvé un professeur pour la demande en ${escapeHtml(subject)} concernant ${escapeHtml(studentName)}. Merci de vous connecter à votre espace famille pour consulter son profil et <strong>valider ou refuser</strong> cette proposition.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;border-radius:12px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#1E3A8A;">
                        ${escapeHtml(teacherName)}${teacherVerified ? ' ✓' : ''}
                      </p>
                      <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;">
                        ${escapeHtml(teacherSubjects.join(', '))}${teacherZone ? ` · ${escapeHtml(teacherZone)}` : ''}
                      </p>
                      ${
                        teacherBio
                          ? `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#374151;">${escapeHtml(teacherBio)}</p>`
                          : ''
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background-color:#EAB308;">
                      <a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1E3A8A;text-decoration:none;border-radius:999px;">
                        Valider ou refuser la proposition →
                      </a>
                    </td>
                  </tr>
                </table>
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
