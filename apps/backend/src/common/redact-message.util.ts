import { Message } from '@prisma/client';

const REMOVED_PLACEHOLDER = "Message supprimé par l'équipe Nafoore";

// Cache le contenu original d'un message retiré par un admin pour les vues
// enseignant/famille — le texte original reste en base pour la traçabilité admin.
export function redactRemovedMessage<T extends Pick<Message, 'body' | 'removedAt'>>(
  message: T,
): T {
  if (!message.removedAt) return message;
  return { ...message, body: REMOVED_PLACEHOLDER };
}

export function countUnread(
  messages: Pick<Message, 'sender' | 'createdAt' | 'removedAt'>[],
  viewerSender: 'teacher' | 'famille',
  readAt: Date | null,
): number {
  return messages.filter(
    (m) =>
      m.sender !== viewerSender &&
      !m.removedAt &&
      (!readAt || m.createdAt > readAt),
  ).length;
}
