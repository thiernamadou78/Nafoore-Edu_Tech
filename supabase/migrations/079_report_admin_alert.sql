-- Alerte a l'equipe quand un compte-rendu manque 2 h apres la fin de la
-- seance : evite d'envoyer l'alerte plusieurs fois.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS report_admin_alert_sent_at TIMESTAMP(3);
