import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Contact2, Loader2, Pencil, Plus, Power, Search, Trash2, UserPlus } from 'lucide-react'
import { api } from '../../lib/api'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Table, Thead, Th, Tbody, Tr, Td } from '../../components/ui/Table'
import { SubjectPicker } from './SubjectPicker'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy'

const EMPTY_FORM = {
  name: '',
  gender: '',
  subjects: [],
  address: '',
  postalCode: '',
  email: '',
  phone: '',
  bio: '',
}

export function TeachersList() {
  const navigate = useNavigate()
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [diplomaFiles, setDiplomaFiles] = useState([])
  const [criminalRecordFile, setCriminalRecordFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const diplomasInputRef = useRef(null)
  const criminalRecordInputRef = useRef(null)

  const load = useCallback(
    () =>
      api
        .get('/teachers')
        .then(setTeachers)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const toggleVerified = async (event, teacher) => {
    event.stopPropagation()
    const key = `${teacher.id}:verify`
    setPendingAction(key)
    setError(null)
    try {
      await api.patch(`/teachers/${teacher.id}/verified`, { verified: !teacher.verified })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingAction(null)
    }
  }

  const handleDelete = async (event, teacher) => {
    event.stopPropagation()
    if (!window.confirm(`Supprimer définitivement ${teacher.name} ?`)) return
    const key = `${teacher.id}:delete`
    setPendingAction(key)
    setError(null)
    try {
      await api.del(`/teachers/${teacher.id}`)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPendingAction(null)
    }
  }

  const visibleTeachers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return teachers
    return teachers.filter((teacher) => teacher.name.toLowerCase().includes(term))
  }, [teachers, search])

  const closeCreate = () => {
    setShowCreate(false)
    setForm(EMPTY_FORM)
    setDiplomaFiles([])
    setCriminalRecordFile(null)
    setError(null)
  }

  const uploadDocument = (teacherId, file, type) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    // Best-effort : le compte enseignant est déjà créé, un échec d'upload ne
    // doit pas bloquer le flux (le document reste ajoutable depuis sa fiche).
    return api.upload(`/teachers/${teacherId}/documents`, formData).catch(() => {})
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (form.subjects.length === 0) {
      setError('Choisissez au moins une matière.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const teacher = await api.post('/teachers', {
        name: form.name,
        gender: form.gender,
        subjects: form.subjects,
        address: form.address,
        postalCode: form.postalCode,
        email: form.email,
        phone: form.phone,
        bio: form.bio.trim(),
      })
      await Promise.all([
        ...diplomaFiles.map((file) => uploadDocument(teacher.id, file, 'diplome')),
        ...(criminalRecordFile ? [uploadDocument(teacher.id, criminalRecordFile, 'casier_judiciaire')] : []),
      ])
      closeCreate()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Enseignants</h1>
          <span className="text-sm text-gray-400">{teachers.length}</span>
        </div>
        <Button icon={UserPlus} onClick={() => setShowCreate(true)}>
          Ajouter un enseignant
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un enseignant"
            className={`${inputClass} py-2 pl-9`}
          />
        </div>
      </div>

      {error && !showCreate && <Alert>{error}</Alert>}

      {loading ? (
        <Card className="p-6">
          <p className="text-sm text-gray-500">Chargement…</p>
        </Card>
      ) : visibleTeachers.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={Contact2}
            title="Aucun enseignant"
            description="Ajoute-en un directement, ou valide une candidature depuis Recrutement."
          />
        </Card>
      ) : (
        <Table>
          <Thead>
            <Th>Enseignant</Th>
            <Th>Matières</Th>
            <Th>Adresse</Th>
            <Th>Statut</Th>
            <Th className="text-right">Actions</Th>
          </Thead>
          <Tbody>
            {visibleTeachers.map((teacher) => (
              <Tr key={teacher.id} onClick={() => navigate(`/enseignants/${teacher.id}`)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-6 w-1 shrink-0 rounded-full ${
                        teacher.verified ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                    <Avatar name={teacher.name} photoUrl={teacher.photoUrl} size="sm" />
                    <span className="font-medium text-gray-900">{teacher.name}</span>
                  </div>
                </Td>
                <Td className="max-w-[240px] truncate text-gray-600">
                  {teacher.subjects.join(', ') || '—'}
                </Td>
                <Td className="text-gray-600">{teacher.address || '—'}</Td>
                <Td>
                  <Badge tone={teacher.verified ? 'green' : 'gray'}>
                    {teacher.verified ? 'Actif' : 'Inactif'}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      title="Modifier"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`/enseignants/${teacher.id}`)
                      }}
                      className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-navy active:scale-90"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      title={teacher.verified ? 'Désactiver' : 'Activer'}
                      onClick={(event) => toggleVerified(event, teacher)}
                      disabled={pendingAction === `${teacher.id}:verify`}
                      className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-gray-100 hover:text-navy active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                    >
                      {pendingAction === `${teacher.id}:verify` ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Power size={16} />
                      )}
                    </button>
                    <button
                      title="Supprimer"
                      onClick={(event) => handleDelete(event, teacher)}
                      disabled={pendingAction === `${teacher.id}:delete`}
                      className="rounded-lg p-1.5 text-gray-400 transition-all duration-150 hover:bg-red-50 hover:text-red-600 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                    >
                      {pendingAction === `${teacher.id}:delete` ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal open={showCreate} onClose={closeCreate} title="Ajouter un enseignant" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Genre *</label>
            <select
              required
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              className={inputClass}
            >
              <option value="">Choisir…</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </div>
          <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nom</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Matières</label>
              <SubjectPicker
                selected={form.subjects}
                onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
              />
            </div>
            <div className="grid grid-cols-[1fr_130px] gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Adresse</label>
                <input
                  required
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Code postal
                </label>
                <input
                  required
                  value={form.postalCode}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                  pattern="\d{5}"
                  maxLength={5}
                  placeholder="75015"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                type="tel"
                required
                pattern="^(\+33 ?|0)[1-9]([ .-]?\d{2}){4}$"
                title="Numéro de téléphone français (ex : 06 12 34 56 78)"
                placeholder="06 12 34 56 78"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Bio *</label>
            <textarea
              rows={3}
              required
              minLength={20}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Présentation courte, expérience, spécialités…"
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Diplômes (PDF, JPG, PNG)
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => diplomasInputRef.current?.click()}
                className="px-3 py-1.5"
              >
                {diplomaFiles.length > 0 ? `${diplomaFiles.length} fichier(s)` : 'Choisir des fichiers'}
              </Button>
              <input
                ref={diplomasInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setDiplomaFiles(Array.from(e.target.files ?? []))}
                className="hidden"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Casier judiciaire (B3)
              </label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => criminalRecordInputRef.current?.click()}
                className="px-3 py-1.5"
              >
                {criminalRecordFile ? criminalRecordFile.name : 'Choisir un fichier'}
              </Button>
              <input
                ref={criminalRecordInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setCriminalRecordFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeCreate}>
              Annuler
            </Button>
            <Button type="submit" icon={Plus} loading={submitting}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
