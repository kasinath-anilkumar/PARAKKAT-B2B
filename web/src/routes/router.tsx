import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginPage } from '../auth/LoginPage';
import { MfaSetupPage, MfaVerifyPage } from '../auth/MfaVerifyPage';
import { RegisterPage } from '../onboarding/RegisterPage';
import { ResumePage } from '../onboarding/ResumePage';
import { ApplicationStatusPage } from '../onboarding/ApplicationStatusPage';
import { AdminDashboard } from '../admin/AdminDashboard';
import { AgencyDashboard } from '../agency/AgencyDashboard';
import { AgentDashboard } from '../agent/AgentDashboard';
import { ApplicationDetailPage } from '../admin/ApplicationDetailPage';
import { ApplicationsPage } from '../admin/ApplicationsPage';
import { AuditLogPage } from '../admin/AuditLogPage';
import { ReportsPage } from '../admin/ReportsPage';
import { AgencyManagementPage } from '../admin/AgencyManagementPage';
import { AgencyDetailPage } from '../admin/AgencyDetailPage';
import { AgentDetailPage } from '../shared/AgentDetailPage';
import { SectionPlaceholder, type SectionVariant } from '../admin/SectionPlaceholder';
import { AgentsPage } from '../admin/sections/AgentsPage';
import { ResortsPage } from '../admin/sections/ResortsPage';
import { PricingPage } from '../admin/sections/PricingPage';
import { AdminBookingsPage } from '../admin/sections/AdminBookingsPage';
import { AdminFinancePage } from '../admin/sections/AdminFinancePage';
import { NotificationsPage } from '../admin/sections/NotificationsPage';
import { CrsPage } from '../admin/sections/CrsPage';
import { IntegrationsPage } from '../admin/sections/IntegrationsPage';
import { SecurityPage } from '../admin/sections/SecurityPage';
import { SettingsPage } from '../admin/sections/SettingsPage';
import { SupportPage } from '../admin/sections/SupportPage';
import { InventoryPage } from '../admin/sections/InventoryPage';
import { AgencyAgentsPage } from '../agency/sections/AgencyAgentsPage';
import { AgencyBookingsPage } from '../agency/sections/AgencyBookingsPage';
import { GuestsPage } from '../agency/sections/GuestsPage';
import { AgencyPaymentsPage } from '../agency/sections/AgencyPaymentsPage';
import { AgencyReportsPage } from '../agency/sections/AgencyReportsPage';
import { AgencyNotificationsPage } from '../agency/sections/AgencyNotificationsPage';
import { ProfilePage } from '../agency/sections/ProfilePage';
import { AccountSettingsPage } from '../agency/sections/AccountSettingsPage';
import { AgencySupportPage } from '../agency/sections/AgencySupportPage';
import { AgentBookingsPage } from '../agent/sections/AgentBookingsPage';
import { AgentGuestsPage } from '../agent/sections/AgentGuestsPage';
import { AgentNotificationsPage } from '../agent/sections/AgentNotificationsPage';
import { AgentProfilePage } from '../agent/sections/AgentProfilePage';
import { AgentSupportPage } from '../agent/sections/AgentSupportPage';
import type { IconName } from '../components/layout/icons';

import { SearchPage } from '../agent/SearchPage';
import { BookingsPage } from '../agent/BookingsPage';
import { ProtectedRoute } from './ProtectedRoute';

// Any admin sidebar leaf that doesn't have a purpose-built page yet lands on a
// titled placeholder derived from its path — one route covers them all, so the
// full menu is navigable while screens are built out section by section.
const ICON_HINTS: [RegExp, IconName][] = [
  [/agent/, 'agents'],
  [/agenc/, 'agencies'],
  [/resort|room|meal|bed|occupancy|checkin/, 'resorts'],
  [/pric|markup|season|festival|promo|base/, 'pricing'],
  [/book/, 'bookings'],
  [/pay|invoice|credit|refund|finance|recon/, 'finance'],
  [/report/, 'reports'],
  [/notif|template|broadcast/, 'bell'],
  [/verif|ekyc|kyc/, 'shield'],
  [/crs/, 'sync'],
  [/airpay|email|sms|whatsapp|integration/, 'integrations'],
  [/audit|login|session|failed/, 'activity'],
  [/security|password|two-factor|ip-/, 'lock'],
  [/setting/, 'settings'],
  [/support|ticket/, 'support'],
];

function iconForPath(path: string): IconName {
  for (const [re, icon] of ICON_HINTS) if (re.test(path)) return icon;
  return 'settings';
}

// Pick the skeleton layout that matches the section's eventual shape.
function variantForPath(path: string): SectionVariant {
  if (/setting|policy|config|password|two-factor|ip-|rules|company|financial|portal/.test(path)) return 'form';
  if (/resort|room|meal|bed|amenit|promo|template|campaign|offer/.test(path)) return 'cards';
  if (/report|performance|occupancy-report|analytic/.test(path)) return 'reports';
  return 'table';
}

// Built-out admin section pages (ADMIN-only). Order doesn't matter — each is a
// distinct path that outranks the /admin/* placeholder catch-all.
const ADMIN_PAGES: { path: string; element: JSX.Element }[] = [
  { path: '/admin/agents', element: <AgentsPage /> },
  { path: '/admin/resorts', element: <ResortsPage /> },
  { path: '/admin/pricing', element: <PricingPage /> },
  { path: '/admin/bookings', element: <AdminBookingsPage /> },
  { path: '/admin/finance', element: <AdminFinancePage /> },
  { path: '/admin/notifications', element: <NotificationsPage /> },
  { path: '/admin/inventory', element: <InventoryPage /> },
  { path: '/admin/crs', element: <CrsPage /> },
  { path: '/admin/integrations', element: <IntegrationsPage /> },
  { path: '/admin/security', element: <SecurityPage /> },
  { path: '/admin/settings', element: <SettingsPage /> },
  { path: '/admin/support', element: <SupportPage /> },
];

// Built-out agency section pages (AGENCY-only).
const AGENCY_PAGES: { path: string; element: JSX.Element }[] = [
  { path: '/agency/agents', element: <AgencyAgentsPage /> },
  { path: '/agency/bookings', element: <AgencyBookingsPage /> },
  { path: '/agency/guests', element: <GuestsPage /> },
  { path: '/agency/payments', element: <AgencyPaymentsPage /> },
  { path: '/agency/reports', element: <AgencyReportsPage /> },
  { path: '/agency/notifications', element: <AgencyNotificationsPage /> },
  { path: '/agency/profile', element: <ProfilePage /> },
  { path: '/agency/settings', element: <AccountSettingsPage /> },
  { path: '/agency/support', element: <AgencySupportPage /> },
];

// Built-out agent (sub-user) section pages (AGENT-only).
const AGENT_PAGES: { path: string; element: JSX.Element }[] = [
  { path: '/agent/bookings', element: <AgentBookingsPage /> },
  { path: '/agent/guests', element: <AgentGuestsPage /> },
  { path: '/agent/notifications', element: <AgentNotificationsPage /> },
  { path: '/agent/profile', element: <AgentProfilePage /> },
  { path: '/agent/support', element: <AgentSupportPage /> },
];

function AdminPlaceholder() {
  const { pathname } = useLocation();
  const seg = pathname.split('/').filter(Boolean).pop() ?? 'admin';
  const title = seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return <SectionPlaceholder title={title} icon={iconForPath(pathname)} variant={variantForPath(pathname)} />;
}

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMIN':
    case 'VERIFIER':
      return <AdminDashboard />;
    case 'AGENCY':
      return <AgencyDashboard />;
    case 'AGENT':
      return <AgentDashboard />;
  }
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mfa/verify" element={<MfaVerifyPage />} />
      <Route path="/mfa/setup" element={<MfaSetupPage />} />
      <Route path="/onboarding/register" element={<RegisterPage />} />
      <Route path="/onboarding/resume" element={<ResumePage />} />
      <Route path="/onboarding/status" element={<ApplicationStatusPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'VERIFIER']}>
            <ApplicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/applications/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'VERIFIER']}>
            <ApplicationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/agencies"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AgencyManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/agencies/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AgencyDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/agents/:id"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AgentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agency/agents/:id"
        element={
          <ProtectedRoute allowedRoles={['AGENCY']}>
            <AgentDetailPage />
          </ProtectedRoute>
        }
      />
      {ADMIN_PAGES.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<ProtectedRoute allowedRoles={['ADMIN']}>{element}</ProtectedRoute>}
        />
      ))}
      {AGENCY_PAGES.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<ProtectedRoute allowedRoles={['AGENCY']}>{element}</ProtectedRoute>}
        />
      ))}
      {AGENT_PAGES.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={<ProtectedRoute allowedRoles={['AGENT']}>{element}</ProtectedRoute>}
        />
      ))}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book"
        element={
          <ProtectedRoute allowedRoles={['AGENT', 'AGENCY']}>
            <SearchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute allowedRoles={['AGENT', 'AGENCY']}>
            <BookingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
