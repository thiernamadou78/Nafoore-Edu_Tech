-- Permet un vrai echange sur un ticket de support (l'admin peut repondre,
-- l'enseignant peut relancer), au lieu d'un message unique en lecture seule.
-- Le message d'ouverture du ticket reste sur support_tickets.message.

CREATE TABLE support_messages (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id  TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender     TEXT NOT NULL CHECK (sender IN ('teacher', 'admin')),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX support_messages_ticket_id_idx ON support_messages(ticket_id);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
