export const LEVEL_LABELS = {
  primaire: 'Primaire',
  college: 'Collège',
  lycee: 'Lycée',
}

export const CLASSE_LABELS = {
  cp: 'CP',
  ce1: 'CE1',
  ce2: 'CE2',
  cm1: 'CM1',
  cm2: 'CM2',
  '6e': '6ème',
  '5e': '5ème',
  '4e': '4ème',
  '3e': '3ème',
  '2nde': '2nde',
  '1re': '1ère',
  terminale: 'Terminale',
}

export const CLASSE_OPTIONS_BY_LEVEL = {
  primaire: ['cp', 'ce1', 'ce2', 'cm1', 'cm2'],
  college: ['6e', '5e', '4e', '3e'],
  lycee: ['2nde', '1re', 'terminale'],
}

export const SESSION_STATUS_LABELS = {
  planifiee: 'Planifiée',
  confirmee: 'Confirmée',
  realisee: 'Réalisée',
  annulee: 'Annulée',
  reportee: 'Reportée',
}

export const SESSION_STATUS_TONES = {
  planifiee: 'blue',
  confirmee: 'indigo',
  realisee: 'green',
  annulee: 'red',
  reportee: 'amber',
}

export const DOCUMENT_TYPE_LABELS = {
  bulletin: 'Bulletin',
  compte_rendu: 'Compte-rendu',
  autre: 'Autre',
}

export const PROGRESS_ENTRY_LABELS = {
  acquis: 'Acquis',
  en_progres: 'En progrès',
  a_surveiller: 'À surveiller',
  pas_commence: 'Pas encore commencé',
}

export const PROGRESS_ENTRY_TONES = {
  acquis: 'green',
  en_progres: 'green',
  a_surveiller: 'amber',
  pas_commence: 'gray',
}

export const PASS_STATUS_LABELS = {
  active: 'Actif',
  revoked: 'Révoqué',
}

export const PASS_STATUS_TONES = {
  active: 'green',
  revoked: 'red',
}

export const VERIFICATION_STATUS_LABELS = {
  valid: 'Valide',
  funding_expired: 'Financement expiré',
  pass_revoked: 'Pass révoqué',
  no_session_found: 'Aucune séance trouvée',
}

export const VERIFICATION_STATUS_TONES = {
  valid: 'green',
  funding_expired: 'amber',
  pass_revoked: 'red',
  no_session_found: 'gray',
}

export const ATTENDANCE_METHOD_LABELS = {
  qr_scan: 'Scan QR',
  manuel: 'Manuel',
}

export const FUNDING_SOURCE_LABELS = {
  family: 'Famille',
  enterprise: 'Entreprise',
  mairie: 'Mairie',
}
