import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { api } from '../../lib/api'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'

export function ConversationsList() {
  const navigate = useNavigate()
  const [threads, setThreads] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/admin/message-threads')
      .then(setThreads)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div>
      <div className="mb-6 flex items-baseline gap-2">
        <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
        {threads && <span className="text-sm text-gray-400">{threads.length}</span>}
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {!threads ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : threads.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Aucune conversation"
            description="Les échanges entre enseignants et familles apparaîtront ici."
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Enseignant</th>
                <th className="px-4 py-3 font-medium">Famille</th>
                <th className="px-4 py-3 font-medium">Messages</th>
                <th className="px-4 py-3 font-medium">Dernier message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {threads.map((thread) => (
                <tr
                  key={thread.id}
                  onClick={() => navigate(`/conversations/${thread.id}`)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{thread.teacherName}</td>
                  <td className="px-4 py-3 text-gray-700">{thread.familyName}</td>
                  <td className="px-4 py-3 text-gray-700">{thread.messageCount}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(thread.lastMessageAt).toLocaleString('fr-FR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
