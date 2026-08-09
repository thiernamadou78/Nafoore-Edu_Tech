export function translateAuthError(err) {
  const message = err?.message || ''
  if (/failed to fetch/i.test(message) || err?.name === 'TypeError') {
    return 'Impossible de contacter le serveur. Vérifie ta connexion et réessaie.'
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Email ou mot de passe incorrect.'
  }
  if (/email not confirmed/i.test(message)) {
    return "Ce compte n'est pas encore confirmé. Contacte l'équipe Nafoore."
  }
  return 'Connexion impossible. Réessaie dans quelques instants.'
}
