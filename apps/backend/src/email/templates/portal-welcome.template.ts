export interface WelcomeEmailInput {
  fullName: string;
  email: string;
  tempPassword: string;
  role: string;
  portalUrl: string;
}

const ROLE_COPY: Record<
  string,
  { portalLabel: string; intro: string }
> = {
  famille: {
    portalLabel: 'espace famille',
    intro:
      "Vous pourrez y inscrire votre enfant, suivre sa progression et échanger avec son enseignant.",
  },
  mairie: {
    portalLabel: 'espace mairie',
    intro:
      'Vous pourrez y consulter les dispositifs de réussite éducative déployés sur votre commune.',
  },
  entreprise: {
    portalLabel: 'espace entreprise',
    intro:
      'Vous pourrez y configurer le Pass Éducatif et gérer les bénéficiaires de votre structure.',
  },
  centre_formation_ecole_pro: {
    portalLabel: 'espace centre de formation / école pro',
    intro:
      'Vous pourrez y configurer vos modules et vos demandes de cours.',
  },
  teacher: {
    portalLabel: 'espace enseignant',
    intro:
      'Vous pourrez y consulter vos élèves, votre planning et vos comptes-rendus de séance.',
  },
};

function copyFor(role: string) {
  return (
    ROLE_COPY[role] ?? {
      portalLabel: 'espace Nafoore',
      intro: 'Vous pourrez y accéder à votre espace personnalisé.',
    }
  );
}

export function renderWelcomeEmail({
  fullName,
  email,
  tempPassword,
  role,
  portalUrl,
}: WelcomeEmailInput): string {
  const { portalLabel, intro } = copyFor(role);

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bienvenue sur Nafoore</title>
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
                <p style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase;color:#EAB308;">Bienvenue</p>
                <h1 style="margin:0 0 16px 0;font-family:Georgia,'Playfair Display',serif;font-size:24px;line-height:1.3;color:#1E3A8A;">
                  Bonjour ${escapeHtml(fullName)},
                </h1>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">
                  Votre compte Nafoore est prêt. ${intro}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f3ef;border-radius:12px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;">Identifiants de connexion</p>
                      <p style="margin:0 0 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1E3A8A;"><strong>Email&nbsp;:</strong> ${escapeHtml(email)}</p>
                      <p style="margin:0;font-family:'Courier New',monospace;font-size:16px;letter-spacing:0.04em;color:#1E3A8A;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;display:inline-block;">${escapeHtml(tempPassword)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6b7280;">
                  Pour votre sécurité, il vous sera demandé de changer ce mot de passe temporaire dès votre première connexion.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:999px;background-color:#EAB308;">
                      <a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1E3A8A;text-decoration:none;border-radius:999px;">
                        Accéder à mon ${portalLabel} →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 28px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">
                  Vous recevez cet email car un compte Nafoore vient d'être créé pour ${escapeHtml(email)}.
                  Si vous n'êtes pas à l'origine de cette demande, contactez-nous à contact@nafoore.fr.
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
