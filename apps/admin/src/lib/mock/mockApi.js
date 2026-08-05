// Routeur factice pour le mode démo — reproduit le comportement des endpoints NestJS
// (auth + RBAC + pipeline de recrutement + élèves) sans backend réel. Voir apps/admin/README.md.
import {
  mockAdminAccounts,
  mockLeads,
  mockStudents,
  mockTeacherApplications,
  mockTeachers,
} from './mockDb'
import { getCurrentAccountId } from './mockAuth'

function delay(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function currentAccount() {
  const id = getCurrentAccountId()
  return mockAdminAccounts.find((a) => a.id === id) ?? null
}

function requireAuth() {
  const account = currentAccount()
  if (!account || !account.isActive) {
    throw new Error('Non authentifié (mode démo)')
  }
  return account
}

function requireRole(account, roles) {
  if (!roles.some((role) => account.roles.includes(role))) {
    throw new Error('Rôle insuffisant pour cette action (mode démo)')
  }
}

function toAccountDto({ id, email, name, isActive, createdAt, roles }) {
  return { id, email, name, isActive, createdAt, roles }
}

function toAccountRef(accountId) {
  const account = mockAdminAccounts.find((a) => a.id === accountId)
  return account ? { id: account.id, name: account.name } : null
}

function toTeacherRef(teacherId) {
  const teacher = mockTeachers.find((t) => t.id === teacherId)
  return teacher ? { id: teacher.id, name: teacher.name, subjects: teacher.subjects } : null
}

function toStudentSummaryDto(student) {
  return {
    id: student.id,
    name: student.name,
    level: student.level,
    subjects: student.subjects,
    photoUrl: student.photoUrl,
    createdAt: student.createdAt,
    teachers: student.teacherIds.map((teacherId) => ({ teacher: toTeacherRef(teacherId) })),
  }
}

function toTeacherDto(teacher) {
  return {
    id: teacher.id,
    name: teacher.name,
    subjects: teacher.subjects,
    verified: teacher.verified,
    bio: teacher.bio,
    zone: teacher.zone,
    email: teacher.email,
    phone: teacher.phone,
    photoUrl: teacher.photoUrl,
  }
}

function toStudentDetailDto(student) {
  return {
    ...toStudentSummaryDto(student),
    objectives: student.objectives,
    parentLeadId: student.parentLeadId,
    parentLead: student.parentLead,
    sessions: [...student.sessions]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((session) => ({
        ...session,
        teacher: session.teacherId ? toTeacherRef(session.teacherId) : null,
      })),
    progressReports: [...student.progressReports]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((report) => ({
        ...report,
        adminAccount: toAccountRef(report.adminAccountId),
      })),
    documents: [...student.documents]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((doc) => ({
        id: doc.id,
        type: doc.type,
        fileName: doc.fileName,
        createdAt: doc.createdAt,
        uploadedBy: toAccountRef(doc.uploadedById),
      })),
    teacherHistory: [...student.teacherHistory]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((entry) => ({
        ...entry,
        teacher: toTeacherRef(entry.teacherId),
        adminAccount: toAccountRef(entry.adminAccountId),
      })),
  }
}

const STALE_LEAD_DAYS = 3

function buildDashboardSummary() {
  const now = Date.now()
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const staleThreshold = new Date(now - STALE_LEAD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const studentsByProfile = { famille: 0, mairie: 0, entreprise: 0, autre: 0 }
  let activeStudents = 0
  mockLeads.forEach((lead) => {
    lead.students.forEach(() => {
      activeStudents += 1
      studentsByProfile[lead.profile] = (studentsByProfile[lead.profile] ?? 0) + 1
    })
  })

  const totalLeads = mockLeads.length
  const convertedLeads = mockLeads.filter((l) => l.status === 'converti').length

  return {
    activeStudents,
    leadsThisMonth: mockLeads.filter((l) => l.createdAt >= startOfMonth).length,
    conversionRate: totalLeads > 0 ? convertedLeads / totalLeads : 0,
    studentsByProfile,
    alerts: {
      staleLeads: mockLeads
        .filter((l) => l.status === 'nouveau' && l.createdAt <= staleThreshold)
        .map(({ id, name, createdAt }) => ({ id, name, createdAt })),
      pendingTeacherApplications: mockTeacherApplications
        .filter((a) => a.status !== 'valide' && a.status !== 'refuse')
        .map(({ id, candidateName, status, createdAt }) => ({
          id,
          candidateName,
          status,
          createdAt,
        })),
    },
  }
}

export async function mockRequest(path, options = {}) {
  await delay()

  const method = options.method ?? 'GET'
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const body = isFormData
    ? options.body
    : options.body
      ? JSON.parse(options.body)
      : undefined
  const [pathname, search] = path.split('?')
  const params = new URLSearchParams(search ?? '')
  const segments = pathname.split('/').filter(Boolean)

  const account = requireAuth()

  if (method === 'GET' && pathname === '/admin/me') {
    return toAccountDto(account)
  }

  if (method === 'GET' && pathname === '/dashboard') {
    requireRole(account, ['super_admin', 'admin'])
    return buildDashboardSummary()
  }

  if (segments[0] === 'teachers') {
    requireRole(account, ['super_admin', 'admin'])

    if (method === 'GET' && segments.length === 1) {
      const verifiedOnly = params.get('verified') === 'true'
      return mockTeachers
        .filter((t) => !verifiedOnly || t.verified)
        .map(toTeacherDto)
    }

    if (method === 'POST' && segments.length === 1) {
      const newTeacher = {
        id: `teacher-${Date.now()}`,
        name: body.name,
        subjects: body.subjects ?? [],
        bio: body.bio ?? null,
        zone: body.zone ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        verified: true,
        photoUrl: null,
      }
      mockTeachers.push(newTeacher)
      return toTeacherDto(newTeacher)
    }

    const target = mockTeachers.find((t) => t.id === segments[1])
    if (!target) throw new Error('Enseignant introuvable (mode démo)')

    if (method === 'GET' && segments.length === 2) {
      return toTeacherDto(target)
    }

    if (method === 'PATCH' && segments.length === 2) {
      if (body.name !== undefined) target.name = body.name
      if (body.subjects !== undefined) target.subjects = body.subjects
      if (body.bio !== undefined) target.bio = body.bio
      if (body.zone !== undefined) target.zone = body.zone
      if (body.email !== undefined) target.email = body.email
      if (body.phone !== undefined) target.phone = body.phone
      return toTeacherDto(target)
    }

    if (method === 'PATCH' && segments[2] === 'verified') {
      target.verified = body.verified
      return toTeacherDto(target)
    }

    if (segments[2] === 'photo') {
      if (method === 'POST') {
        const file = body.get('file')
        if (target.photoUrl) URL.revokeObjectURL(target.photoUrl)
        target.photoUrl = URL.createObjectURL(file)
        return null
      }

      if (method === 'DELETE') {
        if (target.photoUrl) URL.revokeObjectURL(target.photoUrl)
        target.photoUrl = null
        return null
      }
    }
  }

  if (segments[0] === 'admin-accounts' && segments[1] === 'assignable') {
    requireRole(account, ['super_admin', 'admin'])
    return mockAdminAccounts
      .filter((a) => a.isActive && a.roles.some((r) => ['super_admin', 'admin'].includes(r)))
      .map(({ id, name }) => ({ id, name }))
  }

  if (segments[0] === 'admin-accounts') {
    requireRole(account, ['super_admin'])

    if (method === 'GET' && segments.length === 1) {
      return mockAdminAccounts.map(toAccountDto)
    }

    if (method === 'POST' && segments.length === 1) {
      const newAccount = {
        id: `mock-${Date.now()}`,
        email: body.email,
        name: body.name,
        isActive: true,
        createdAt: new Date().toISOString(),
        roles: body.roles,
      }
      mockAdminAccounts.push(newAccount)
      return toAccountDto(newAccount)
    }

    const target = mockAdminAccounts.find((a) => a.id === segments[1])
    if (!target) throw new Error('Compte introuvable (mode démo)')

    if (method === 'PATCH' && segments[2] === 'roles') {
      target.roles = body.roles
      return toAccountDto(target)
    }

    if (method === 'PATCH' && segments[2] === 'active') {
      target.isActive = body.isActive
      return toAccountDto(target)
    }
  }

  if (segments[0] === 'teacher-applications') {
    requireRole(account, ['super_admin', 'admin', 'recruiter'])

    if (method === 'GET' && segments.length === 1) {
      const status = params.get('status')
      const zone = params.get('zone')
      const subject = params.get('subject')
      return mockTeacherApplications.filter(
        (a) =>
          (!status || a.status === status) &&
          (!zone || a.zone.toLowerCase().includes(zone.toLowerCase())) &&
          (!subject || a.subjects.includes(subject)),
      )
    }

    const target = mockTeacherApplications.find((a) => a.id === segments[1])
    if (!target) throw new Error('Candidature introuvable (mode démo)')

    if (method === 'GET' && segments.length === 2) {
      return target
    }

    if (method === 'PATCH' && segments[2] === 'schedule-interview') {
      target.interviewDate = body.interviewDate
      target.status = 'entretien_planifie'
      target.reviewedById = account.id
      target.reviewedBy = { id: account.id, name: account.name }
      return target
    }

    if (method === 'PATCH' && segments[2] === 'notes') {
      target.interviewNotes = body.interviewNotes
      if (target.status === 'preselection' || target.status === 'entretien_planifie') {
        target.status = 'entretien_realise'
      }
      target.reviewedById = account.id
      target.reviewedBy = { id: account.id, name: account.name }
      return target
    }

    if (method === 'PATCH' && segments[2] === 'decision') {
      target.status = body.status
      target.decidedAt = new Date().toISOString()
      target.reviewedById = account.id
      target.reviewedBy = { id: account.id, name: account.name }
      if (body.status === 'valide' && !target.createdTeacherId) {
        target.createdTeacherId = `teacher-${Date.now()}`
      }
      return target
    }
  }

  if (segments[0] === 'leads') {
    requireRole(account, ['super_admin', 'admin'])

    if (method === 'GET' && segments.length === 1) {
      const profile = params.get('profile')
      const status = params.get('status')
      const from = params.get('from')
      const to = params.get('to')
      return mockLeads.filter(
        (l) =>
          (!profile || l.profile === profile) &&
          (!status || l.status === status) &&
          (!from || l.createdAt >= from) &&
          (!to || l.createdAt <= `${to}T23:59:59.999Z`),
      )
    }

    const target = mockLeads.find((l) => l.id === segments[1])
    if (!target) throw new Error('Lead introuvable (mode démo)')

    if (method === 'GET' && segments.length === 2) {
      return target
    }

    if (method === 'POST' && segments[2] === 'notes') {
      const note = {
        id: `note-${Date.now()}`,
        note: body.note,
        createdAt: new Date().toISOString(),
        adminAccount: { id: account.id, name: account.name },
      }
      target.notes.push(note)
      return note
    }

    if (method === 'PATCH' && segments[2] === 'status') {
      target.status = body.status
      return target
    }

    if (method === 'PATCH' && segments[2] === 'assign') {
      const assignee = mockAdminAccounts.find((a) => a.id === body.assignedToId)
      if (!assignee) throw new Error('Compte introuvable (mode démo)')
      target.assignedToId = assignee.id
      target.assignedTo = { id: assignee.id, name: assignee.name }
      return target
    }

    if (method === 'PATCH' && segments[2] === 'unassign') {
      target.assignedToId = null
      target.assignedTo = null
      return target
    }

    if (method === 'POST' && segments[2] === 'convert-to-student') {
      const student = { id: `student-${Date.now()}`, name: target.name, level: body.level }
      target.students.push(student)
      target.status = 'converti'
      return student
    }

    if (method === 'POST' && segments[2] === 'validate') {
      if (!['en_verification', 'valide'].includes(target.status)) {
        throw new Error('Le lead doit être au statut en_verification ou valide (mode démo)')
      }
      if (target.portalAccount) {
        throw new Error('Un compte existe déjà pour ce lead (mode démo)')
      }
      target.portalAccount = { id: `portal-${Date.now()}`, status: 'invite' }
      target.status = 'converti'
      return target.portalAccount
    }

    if (method === 'POST' && segments[2] === 'resend-credentials') {
      if (!target.portalAccount) {
        throw new Error('Aucun compte portail pour ce lead (mode démo)')
      }
      return null
    }
  }

  if (segments[0] === 'students') {
    requireRole(account, ['super_admin', 'admin'])

    if (method === 'GET' && segments.length === 1) {
      const level = params.get('level')
      const subject = params.get('subject')
      return mockStudents
        .filter(
          (s) => (!level || s.level === level) && (!subject || s.subjects.includes(subject)),
        )
        .map(toStudentSummaryDto)
    }

    if (method === 'POST' && segments.length === 1) {
      const newStudent = {
        id: `student-${Date.now()}`,
        name: body.name,
        level: body.level,
        subjects: body.subjects ?? [],
        objectives: body.objectives ?? null,
        createdAt: new Date().toISOString(),
        parentLeadId: body.parentLeadId ?? null,
        parentLead: null,
        teacherIds: [],
        sessions: [],
        progressReports: [],
        documents: [],
        teacherHistory: [],
      }
      mockStudents.push(newStudent)
      return toStudentDetailDto(newStudent)
    }

    const target = mockStudents.find((s) => s.id === segments[1])
    if (!target) throw new Error('Élève introuvable (mode démo)')

    if (method === 'GET' && segments.length === 2) {
      return toStudentDetailDto(target)
    }

    if (method === 'PATCH' && segments.length === 2) {
      if (body.name !== undefined) target.name = body.name
      if (body.level !== undefined) target.level = body.level
      if (body.subjects !== undefined) target.subjects = body.subjects
      if (body.objectives !== undefined) target.objectives = body.objectives
      return toStudentDetailDto(target)
    }

    if (method === 'PATCH' && segments[2] === 'teachers') {
      const nextIds = body.teacherIds
      const added = nextIds.filter((teacherId) => !target.teacherIds.includes(teacherId))
      const removed = target.teacherIds.filter((teacherId) => !nextIds.includes(teacherId))

      added.forEach((teacherId) => {
        target.teacherHistory.push({
          id: `hist-${Date.now()}-${teacherId}`,
          teacherId,
          action: 'assigned',
          adminAccountId: account.id,
          createdAt: new Date().toISOString(),
        })
      })
      removed.forEach((teacherId) => {
        target.teacherHistory.push({
          id: `hist-${Date.now()}-${teacherId}`,
          teacherId,
          action: 'unassigned',
          adminAccountId: account.id,
          createdAt: new Date().toISOString(),
        })
      })

      target.teacherIds = nextIds
      return toStudentDetailDto(target)
    }

    if (segments[2] === 'photo') {
      if (method === 'POST') {
        const file = body.get('file')
        if (target.photoUrl) URL.revokeObjectURL(target.photoUrl)
        target.photoUrl = URL.createObjectURL(file)
        return null
      }

      if (method === 'DELETE') {
        if (target.photoUrl) URL.revokeObjectURL(target.photoUrl)
        target.photoUrl = null
        return null
      }
    }

    if (segments[2] === 'sessions') {
      if (method === 'GET' && segments.length === 3) {
        return toStudentDetailDto(target).sessions
      }

      if (method === 'POST' && segments.length === 3) {
        const session = {
          id: `session-${Date.now()}`,
          date: body.date,
          teacherId: body.teacherId ?? null,
          status: body.status ?? 'planifiee',
          attended: null,
          notes: body.notes ?? null,
        }
        target.sessions.push(session)
        return { ...session, teacher: session.teacherId ? toTeacherRef(session.teacherId) : null }
      }

      if (method === 'PATCH' && segments.length === 4) {
        const session = target.sessions.find((s) => s.id === segments[3])
        if (!session) throw new Error('Séance introuvable (mode démo)')
        if (body.status !== undefined) session.status = body.status
        if (body.attended !== undefined) session.attended = body.attended
        if (body.notes !== undefined) session.notes = body.notes
        return { ...session, teacher: session.teacherId ? toTeacherRef(session.teacherId) : null }
      }
    }

    if (segments[2] === 'progress-reports') {
      if (method === 'GET' && segments.length === 3) {
        return toStudentDetailDto(target).progressReports
      }

      if (method === 'POST' && segments.length === 3) {
        const report = {
          id: `report-${Date.now()}`,
          adminAccountId: account.id,
          period: body.period ?? null,
          content: body.content,
          shareable: body.shareable ?? false,
          createdAt: new Date().toISOString(),
        }
        target.progressReports.push(report)
        return { ...report, adminAccount: { id: account.id, name: account.name } }
      }
    }

    if (segments[2] === 'documents') {
      if (method === 'GET' && segments.length === 3) {
        return toStudentDetailDto(target).documents
      }

      if (method === 'POST' && segments.length === 3) {
        const file = body.get('file')
        const type = body.get('type')
        const document = {
          id: `doc-${Date.now()}`,
          type,
          fileName: file.name,
          uploadedById: account.id,
          createdAt: new Date().toISOString(),
          objectUrl: URL.createObjectURL(file),
        }
        target.documents.push(document)
        return {
          id: document.id,
          type: document.type,
          fileName: document.fileName,
          createdAt: document.createdAt,
          uploadedBy: { id: account.id, name: account.name },
        }
      }

      if (method === 'GET' && segments[4] === 'download') {
        const document = target.documents.find((d) => d.id === segments[3])
        if (!document) throw new Error('Document introuvable (mode démo)')
        return { url: document.objectUrl }
      }

      if (method === 'DELETE' && segments.length === 4) {
        const index = target.documents.findIndex((d) => d.id === segments[3])
        if (index === -1) throw new Error('Document introuvable (mode démo)')
        const [removed] = target.documents.splice(index, 1)
        if (removed.objectUrl) URL.revokeObjectURL(removed.objectUrl)
        return null
      }
    }
  }

  throw new Error(`Route non gérée en mode démo : ${method} ${path}`)
}
