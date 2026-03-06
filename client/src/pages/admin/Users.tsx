import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Plus, X } from 'lucide-react'

interface UserFormData {
  email: string
  name: string
  password: string
  role: string
}

export default function Users() {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    password: '',
    role: 'viewer',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: api.users.list,
  })

  const createMutation = useMutation({
    mutationFn: api.users.create,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.users.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal() },
  })

  const deleteMutation = useMutation({
    mutationFn: api.users.delete,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }) },
  })

  const openModal = (user?: any) => {
    if (user) {
      setEditingUser(user)
      setFormData({ email: user.email, name: user.name, password: '', role: user.role })
    } else {
      setEditingUser(null)
      setFormData({ email: '', name: '', password: '', role: 'viewer' })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    setFormData({ email: '', name: '', password: '', role: 'viewer' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingUser) {
      const updateData: any = { email: formData.email, name: formData.name, role: formData.role }
      if (formData.password) updateData.password = formData.password
      updateMutation.mutate({ id: editingUser.id, data: updateData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const roleBadgeStyle = (role: string): React.CSSProperties => {
    if (role === 'admin') return { background: 'rgba(88,28,135,0.3)', color: '#d8b4fe', border: '1px solid rgba(126,34,206,0.3)' }
    if (role === 'editor') return { background: 'rgba(195,215,144,0.12)', color: '#C3D790', border: '1px solid rgba(195,215,144,0.2)' }
    return { background: 'rgba(58,77,64,0.25)', color: '#8FA08A', border: '1px solid rgba(58,77,64,0.4)' }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-header mb-0">Users</h1>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New User
        </button>
      </div>

      {isLoading ? (
        <div className="card text-center py-12">
          <p className="text-text-secondary animate-pulse-soft text-sm">Loading users...</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Created</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((user: any) => (
                <tr key={user.id} className="table-row">
                  <td className="table-cell-primary">{user.name}</td>
                  <td className="table-cell">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 text-xs rounded-full capitalize font-medium" style={roleBadgeStyle(user.role)}>{user.role}</span>
                  </td>
                  <td className="table-cell">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => openModal(user)} className="link-accent text-sm">Edit</button>
                    <button
                      onClick={() => { if (confirm('Are you sure you want to delete this user?')) { deleteMutation.mutate(user.id) } }}
                      className="link-danger text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="rounded-xl shadow-xl max-w-md w-full p-6 animate-slide-up" style={{ background: '#141F19', border: '1px solid rgba(58,77,64,0.35)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold text-text-primary">
                {editingUser ? 'Edit User' : 'Create User'}
              </h2>
              <button onClick={closeModal} className="text-text-muted hover:text-text-primary transition-colors duration-150 p-1 rounded-lg hover:bg-forest-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="label">Name</label>
                <input id="name" type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="input" required />
              </div>
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input id="email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="input" required />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password {editingUser && <span className="text-text-muted font-normal">(leave blank to keep current)</span>}
                </label>
                <input id="password" type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} className="input" required={!editingUser} />
              </div>
              <div>
                <label htmlFor="role" className="label">Role</label>
                <select id="role" value={formData.role} onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))} className="input">
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
