import type { IconName } from './icons';

/**
 * Admin sidebar — one entry per top-level section. Each links to a single
 * section page; the sub-functions from the original menu spec live inside those
 * pages as tabs, filters and row actions (e.g. "Agencies" lists agencies with
 * suspend/activate/delete actions rather than a menu item per action).
 */
export interface NavNode {
  label: string;
  to?: string;
  icon?: IconName;
  badge?: 'ekyc';
  children?: NavNode[];
}

export const ADMIN_NAV: NavNode[] = [
  { label: 'Dashboard', icon: 'dashboard', to: '/' },
  { label: 'Agency Management', icon: 'agencies', to: '/admin/agencies' },
  { label: 'Agent Management', icon: 'agents', to: '/admin/agents' },
  { label: 'Resort Management', icon: 'resorts', to: '/admin/resorts' },
  { label: 'Pricing Management', icon: 'pricing', to: '/admin/pricing' },
  { label: 'Booking Management', icon: 'bookings', to: '/admin/bookings' },
  { label: 'Finance', icon: 'finance', to: '/admin/finance' },
  { label: 'Reports & Analytics', icon: 'reports', to: '/reports' },
  { label: 'Notification Center', icon: 'bell', to: '/admin/notifications' },
  { label: 'eKYC & Documents', icon: 'shield', badge: 'ekyc', to: '/applications' },
  { label: 'CRS Synchronization', icon: 'sync', to: '/admin/crs' },
  { label: 'Integrations', icon: 'integrations', to: '/admin/integrations' },
  { label: 'Audit Logs', icon: 'activity', to: '/audit' },
  { label: 'Security', icon: 'lock', to: '/admin/security' },
  { label: 'System Settings', icon: 'settings', to: '/admin/settings' },
  { label: 'Support', icon: 'support', to: '/admin/support' },
];
