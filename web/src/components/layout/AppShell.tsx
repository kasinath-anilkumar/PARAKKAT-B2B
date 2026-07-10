import { type ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import * as authApi from '../../api/auth.api';
import * as dashboardApi from '../../api/dashboard.api';
import { useAuth } from '../../hooks/useAuth';
import { Icons } from './icons';
import { ADMIN_NAV, type NavNode } from './adminNav';

const NAV: Record<string, NavNode[]> = {
  ADMIN: ADMIN_NAV,
  VERIFIER: [
    { label: 'Dashboard', icon: 'dashboard', to: '/' },
    { label: 'Applications', icon: 'agencies', to: '/applications' },
    { label: 'Audit Logs', icon: 'activity', to: '/audit' },
  ],
  AGENCY: [
    { label: 'Dashboard', icon: 'dashboard', to: '/' },
    { label: 'Agent Management', icon: 'agents', to: '/agency/agents' },
    { label: 'Resort Search', icon: 'search', to: '/book' },
    { label: 'Booking Management', icon: 'bookings', to: '/agency/bookings' },
    { label: 'Guest Management', icon: 'agencies', to: '/agency/guests' },
    { label: 'Payments & Credit', icon: 'finance', to: '/agency/payments' },
    { label: 'Reports', icon: 'reports', to: '/agency/reports' },
    { label: 'Notifications', icon: 'bell', to: '/agency/notifications' },
    { label: 'Profile & Company', icon: 'shield', to: '/agency/profile' },
    { label: 'Account Settings', icon: 'lock', to: '/agency/settings' },
    { label: 'Support', icon: 'support', to: '/agency/support' },
  ],
  AGENT: [
    { label: 'Dashboard', icon: 'dashboard', to: '/' },
    { label: 'Search & Book', icon: 'search', to: '/book' },
    { label: 'Booking Management', icon: 'bookings', to: '/agent/bookings' },
    { label: 'Guest Management', icon: 'agencies', to: '/agent/guests' },
    { label: 'Notifications', icon: 'bell', to: '/agent/notifications' },
    { label: 'Profile', icon: 'agents', to: '/agent/profile' },
    { label: 'Support', icon: 'support', to: '/agent/support' },
  ],
};

function initials(email?: string): string {
  if (!email) return '?';
  return email.slice(0, 2).toUpperCase();
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearSession } = useAuth();
  const nodes = NAV[user?.role ?? ''] ?? [];
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === '1');

  const { data: summary } = useQuery({
    queryKey: ['admin-summary'],
    queryFn: dashboardApi.getAdminSummary,
    enabled: user?.role === 'ADMIN',
    staleTime: 30_000,
  });
  const ekycCount = summary?.approvals?.ekycPending ?? 0;

  // --- Active-route detection (query-aware for tab/action leaves) ---
  const activePath = location.pathname;
  const current = activePath + location.search;
  const stripQuery = (to?: string) => (to ? to.split('?')[0] : '');
  const leafActive = (to?: string): boolean => {
    if (!to) return false;
    return to.includes('?') ? to === current : stripQuery(to) === activePath;
  };
  const nodeActive = (n: NavNode): boolean =>
    leafActive(n.to) || (n.children?.some(nodeActive) ?? false);

  // --- Accordion open state, keyed by full label-path so repeated labels
  //     (e.g. "Monitoring" under two sections) stay independent. ---
  const nodeId = (label: string, parentId: string) => (parentId ? `${parentId}/${label}` : label);
  const activeOpenIds = (list: NavNode[], parentId = ''): string[] => {
    const ids: string[] = [];
    for (const n of list) {
      if (!n.children) continue;
      const id = nodeId(n.label, parentId);
      if (nodeActive(n)) ids.push(id, ...activeOpenIds(n.children, id));
    }
    return ids;
  };

  const [open, setOpen] = useState<Set<string>>(() => new Set(activeOpenIds(nodes)));

  // Keep the branch containing the active route revealed as the user navigates.
  useEffect(() => {
    setOpen((prev) => {
      const n = new Set(prev);
      activeOpenIds(nodes).forEach((id) => n.add(id));
      return n;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const toggleOpen = (id: string) =>
    setOpen((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  useEffect(() => setMobileOpen(false), [location.pathname]);

  function setCollapsedPersist(next: boolean) {
    localStorage.setItem('sidebar_collapsed', next ? '1' : '0');
    setCollapsed(next);
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      navigate('/login');
    }
  }

  // --- Expanded (accordion) rendering, recursive to any depth ---
  function renderNode(node: NavNode, parentId: string, depth: number): ReactNode {
    const id = nodeId(node.label, parentId);
    const Icon = node.icon ? Icons[node.icon] : null;
    const showBadge = node.badge === 'ekyc' && ekycCount > 0;
    const badge = showBadge ? (
      <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">{ekycCount}</span>
    ) : null;

    if (node.children) {
      const isOpen = open.has(id);
      const active = nodeActive(node);
      return (
        <div key={id}>
          <button
            onClick={() => toggleOpen(id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm hover:bg-slate-100 ${
              active ? 'font-medium text-blue-700' : depth === 0 ? 'text-slate-600' : 'text-slate-500'
            }`}
          >
            {Icon ? <Icon className="h-[18px] w-[18px] shrink-0" /> : <span className="w-1" />}
            <span className="flex-1 truncate text-left">{node.label}</span>
            {badge}
            <Icons.chevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          </button>
          {isOpen && (
            <div className="ml-[26px] mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">
              {node.children.map((c) => renderNode(c, id, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const active = leafActive(node.to);
    return (
      <Link
        key={id}
        to={node.to ?? '#'}
        className={`flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm ${
          active ? 'bg-blue-600 font-medium text-white' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {Icon ? (
          <Icon className="h-[18px] w-[18px] shrink-0" />
        ) : (
          <span className={`ml-1 h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-white' : 'bg-slate-300'}`} />
        )}
        <span className="flex-1 truncate">{node.label}</span>
        {badge}
      </Link>
    );
  }

  // --- Collapsed rendering: top-level icons only; a section expands the rail. ---
  function renderCollapsed(node: NavNode) {
    const Icon = node.icon ? Icons[node.icon] : Icons.settings;
    const showBadge = node.badge === 'ekyc' && ekycCount > 0;
    const active = nodeActive(node);
    const dot = showBadge ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" /> : null;

    if (node.children) {
      return (
        <button
          key={node.label}
          title={node.label}
          onClick={() => {
            setCollapsedPersist(false);
            setOpen((p) => new Set(p).add(node.label));
          }}
          className={`relative flex w-full items-center justify-center rounded-md px-2 py-1.5 ${
            active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
          {dot}
        </button>
      );
    }
    return (
      <NavLink
        key={node.label}
        to={node.to ?? '#'}
        end={node.to === '/'}
        title={node.label}
        className={({ isActive }) =>
          `relative flex items-center justify-center rounded-md px-2 py-1.5 ${
            isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`
        }
      >
        <Icon className="h-[18px] w-[18px]" />
        {dot}
      </NavLink>
    );
  }

  const renderSidebar = (compact: boolean) => (
    <>
      <div className={`flex items-center gap-2 py-4 ${compact ? 'justify-center px-2' : 'px-4'}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Icons.resorts className="h-5 w-5" />
        </div>
        {!compact && (
          <div className="leading-tight">
            <div className="text-sm font-bold text-slate-900">Resort B2B</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              {user?.role === 'ADMIN' ? 'Admin Panel' : 'Portal'}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {compact ? (
          <div className="space-y-0.5">{nodes.map((n) => renderCollapsed(n))}</div>
        ) : (
          <div className="space-y-0.5">{nodes.map((n) => renderNode(n, '', 0))}</div>
        )}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsedPersist(!collapsed)}
        className={`hidden items-center gap-2 border-t border-slate-100 py-2 text-xs text-slate-500 hover:bg-slate-50 lg:flex ${compact ? 'justify-center px-2' : 'px-4'}`}
        title={compact ? 'Expand' : 'Collapse'}
      >
        <Icons.chevronLeft className={`h-4 w-4 transition-transform ${compact ? 'rotate-180' : ''}`} />
        {!compact && <span>Collapse</span>}
      </button>

      <div className="border-t border-slate-100 p-2">
        <div className={`flex items-center gap-2.5 rounded-md py-1.5 ${compact ? 'justify-center px-0' : 'px-2'}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white" title={user?.email}>
            {initials(user?.email)}
          </div>
          {!compact && (
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-medium text-slate-900">{user?.role}</div>
              <div className="truncate text-[11px] text-slate-400">{user?.email}</div>
            </div>
          )}
          {!compact && (
            <button onClick={handleLogout} title="Log out" className="text-slate-400 hover:text-slate-700">
              <Icons.logout className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 hidden flex-col border-r border-slate-200 bg-white transition-all lg:flex ${collapsed ? 'w-16' : 'w-60'}`}>
        {renderSidebar(collapsed)}
      </aside>

      {/* Mobile drawer (always full labels) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">{renderSidebar(false)}</aside>
        </div>
      )}

      {/* Main column */}
      <div className={`flex min-h-screen flex-1 flex-col transition-all ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur">
          <button className="text-slate-500 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Icons.menu className="h-5 w-5" />
          </button>
          <div className="hidden items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-400 sm:flex">
            <Icons.search className="h-4 w-4" />
            <span>Search…</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative text-slate-400 hover:text-slate-700" aria-label="Notifications">
              <Icons.bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-white">
                {initials(user?.email)}
              </div>
              <span className="hidden text-sm text-slate-600 sm:inline">{user?.role}</span>
            </div>
            <button onClick={handleLogout} title="Log out" className="text-slate-400 hover:text-slate-700">
              <Icons.logout className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4">
          {title && <h1 className="mb-3 text-xl font-semibold text-slate-900">{title}</h1>}
          {children}
        </main>
      </div>
    </div>
  );
}
