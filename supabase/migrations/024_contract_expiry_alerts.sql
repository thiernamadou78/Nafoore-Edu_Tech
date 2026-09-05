-- Module Entreprise — Alerte d'expiration de contrat (Phase 4)
-- expiry_alert_sent_at évite de renvoyer l'alerte à chaque exécution du cron
-- une fois qu'elle a été envoyée pour un contrat donné.

ALTER TABLE enterprise_contracts ADD COLUMN expiry_alert_sent_at TIMESTAMPTZ;
