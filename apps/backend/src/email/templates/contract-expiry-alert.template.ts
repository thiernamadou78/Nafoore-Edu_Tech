import { getPlatformTimezone } from '../../common/timezone';

export interface ContractExpiryAlertEmailInput {
  enterpriseName: string;
  formulaName: string;
  dateExpiration: Date;
  daysRemaining: number;
  adminUrl?: string;
}

export function renderContractExpiryAlertEmail({
  enterpriseName,
  formulaName,
  dateExpiration,
  daysRemaining,
  adminUrl,
}: ContractExpiryAlertEmailInput): string {
  const dateLabel = dateExpiration.toLocaleDateString('fr-FR', {
    timeZone: getPlatformTimezone(),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Contrat Pass Éducatif — expiration à venir</title>
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
                <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#EAB308;">Contrat Pass Éducatif</p>
                <h1 style="margin:0 0 16px 0;font-family:Georgia,'Playfair Display',serif;font-size:22px;line-height:1.3;color:#1E3A8A;">
                  Expiration dans ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}
                </h1>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
                  Le contrat <strong>${escapeHtml(formulaName)}</strong> de
                  <strong>${escapeHtml(enterpriseName)}</strong> arrive à échéance le
                  <strong>${dateLabel}</strong>. Sans renouvellement avant cette date, le
                  contrat passera automatiquement au statut « expiré » et les Pass Éducatif
                  associés ne pourront plus être validés en séance.
                </p>
              </td>
            </tr>
            ${
              adminUrl
                ? `<tr>
              <td style="padding:0 32px 32px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background-color:#EAB308;">
                      <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1E3A8A;text-decoration:none;border-radius:999px;">
                        Voir le contrat →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding:24px 32px 28px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  Vous recevez cet email en tant que contact référencé sur ce contrat Pass Éducatif Nafoore Education.
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
