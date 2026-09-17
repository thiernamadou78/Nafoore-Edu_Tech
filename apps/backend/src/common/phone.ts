// Numero francais (fixe ou mobile), avec ou sans indicatif +33, separateurs
// espace/point/tiret optionnels entre les paires de chiffres — couvre les
// formats usuels ("0612345678", "06 12 34 56 78", "+33 6 12 34 56 78")
// sans etre trop strict sur la ponctuation.
export const PHONE_REGEX = /^(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}$/;
export const PHONE_ERROR_MESSAGE = 'Numéro de téléphone invalide (ex : 06 12 34 56 78)';
