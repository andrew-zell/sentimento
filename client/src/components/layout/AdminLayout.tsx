import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  MessageSquare,
  BarChart2,
  Users,
  LogOut,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/surveys', label: 'Surveys', icon: ClipboardList },
  { path: '/admin/questionnaires', label: 'Questionnaires', icon: FileText },
  { path: '/admin/responses', label: 'Responses', icon: MessageSquare },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
]

const adminOnlyItems = [
  { path: '/admin/users', label: 'Users', icon: Users },
]

function NavItem({ item, isActive }: { item: typeof navItems[number]; isActive: boolean }) {
  const Icon = item.icon
  return (
    <Link
      to={item.path}
      className="group flex items-center px-3 py-2.5 text-base font-medium rounded-md transition-all duration-200"
      style={{
        color: isActive ? '#C3D790' : '#4A6055',
        background: isActive ? 'rgba(195,215,144,0.07)' : 'transparent',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#5E7A6A' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#4A6055' }}
    >
      <Icon
        size={15}
        className="mr-3 flex-shrink-0"
        style={{ color: isActive ? '#C3D790' : '#3A4D40' }}
      />
      <span className="flex-1">{item.label}</span>
      {isActive && (
        <ChevronRight size={12} style={{ color: '#C3D790', opacity: 0.4 }} />
      )}
    </Link>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const allNavItems = user?.role === 'admin'
    ? [...navItems, ...adminOnlyItems]
    : navItems

  const isActive = (item: typeof navItems[number]) => {
    if (item.exact) return location.pathname === item.path
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  }

  const userInitials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <div className="min-h-screen bg-forest-950 flex">
      {/* Sidebar — no panel, no strokes, blends into page bg */}
      <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-20" style={{ background: '#111813' }}>
        {/* Brand */}
        <div className="px-6 pt-7 pb-6">
          <img
            src="/sentimento.svg"
            alt="Sentimento"
            className="h-7 w-auto"
            style={{ maxWidth: '130px' }}
          />
          <p className="text-sm mt-2" style={{ color: '#4A6055' }}>Experience Center</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <p className="px-3 text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#2E3D33' }}>
            Analytics
          </p>
          <div className="space-y-0.5 mb-5">
            {allNavItems.slice(0, 2).map(item => (
              <NavItem key={item.path} item={item} isActive={isActive(item)} />
            ))}
          </div>

          <p className="px-3 text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#2E3D33' }}>
            Management
          </p>
          <div className="space-y-0.5">
            {allNavItems.slice(2).map(item => (
              <NavItem key={item.path} item={item} isActive={isActive(item)} />
            ))}
          </div>
        </nav>

        {/* User footer — no top border */}
        <div className="px-4 py-5">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg transition-colors duration-150 group"
            style={{ cursor: 'default' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(195,215,144,0.08)', border: '1px solid rgba(195,215,144,0.15)' }}>
              <span className="text-xs font-semibold" style={{ color: '#7A9585' }}>{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#5E7A6A' }}>{user?.name}</p>
              <p className="text-xs capitalize" style={{ color: '#3A4D40' }}>{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="transition-colors duration-150 opacity-0 group-hover:opacity-100"
              style={{ color: '#3A4D40' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3A4D40')}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 min-h-screen">
        <div className="p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
