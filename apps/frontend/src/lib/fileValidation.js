const MAX_SIZE_BYTES = 5 * 1024 * 1024
const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const IMAGE_TYPES = ['image/jpeg', 'image/png']

export const DOCUMENT_FORMATS_HINT = 'PDF, JPG ou PNG, 5 Mo maximum par fichier'
export const PHOTO_FORMATS_HINT = 'JPG ou PNG, 5 Mo maximum'

export function validateUploads(files, kind = 'document') {
  const allowed = kind === 'photo' ? IMAGE_TYPES : DOCUMENT_TYPES
  const hint = kind === 'photo' ? PHOTO_FORMATS_HINT : DOCUMENT_FORMATS_HINT
  for (const file of files) {
    if (!allowed.includes(file.type)) {
      return `Le fichier « ${file.name} » n'est pas pris en compte : ce type de fichier n'est pas accepté. Formats acceptés : ${hint}.`
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `Le fichier « ${file.name} » est trop volumineux. Formats acceptés : ${hint}.`
    }
  }
  return ''
}

export function uploadErrorMessage(res, data, fallback) {
  if (res.status === 413) return 'Fichier trop volumineux (5 Mo maximum par fichier).'
  return data?.message || fallback
}
