import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/themeContext';
import { MobileProvider } from '@/lib/MobileContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ModuleGate from '@/components/ModuleGate';

// Pages
import Landing from './pages/Landing';
import AuthRedirect from './pages/AuthRedirect';
import AdminDashboard from './pages/AdminDashboard';
import TLDashboard from './pages/TLDashboard';
import SWDashboard from './pages/SWDashboard';
// New Team Leader / Team Manager / Regional Manager overview dashboard, merged in from
// the client's latest base44 export alongside the updated Admin Dashboard.
import UNVSL_Dashboard from './pages/UNVSL_Dashboard';
import ResidentPortal from './pages/ResidentPortal';
import ExternalPortal from './pages/ExternalPortal';
import Residents from './pages/Residents';
import VisitReports from './pages/VisitReports';
import VisitReportNew from './pages/VisitReportNew';
import Staff from './pages/Staff';
import DailyLogs from './pages/DailyLogs';
import Activities from './pages/Activities';
// Legacy imports removed — functionality now consolidated in Residents module
import CareServices from './pages/CareServices';
import RiskManagement from './pages/RiskManagement';
import HouseManagement from './pages/HouseManagement.jsx';
import Health from './pages/Health';
import Education from './pages/Education';
import Transitions from './pages/Transitions';
import Analytics from './pages/Analytics';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Homes from './pages/Homes';
import HomeDetail from './pages/HomeDetail';
import HomesHub from './pages/HomesHub';
import HandoverPage from './pages/HandoverPage';
import AssetProfilePage from './pages/AssetProfilePage';

import Finance from './pages/Finance';
import FinanceHome from './pages/FinanceHome';
import Care from './pages/Care';
import CareResident from './pages/CareResident';
import Shifts from './pages/Shifts';
import MyShifts from './pages/MyShifts';
import SWPerformance from './pages/SWPerformance';
import EmployeePerformance from './pages/EmployeePerformance';
import MyHR from './pages/MyHR';
import Approvals from './pages/Approvals';
import WorkflowCommandCentre from './pages/WorkflowCommandCentre';
import ComplianceHub from './pages/ComplianceHub';
import YoungPersonWorkspace from './pages/YoungPersonWorkspace';
import AuditTrail from './pages/AuditTrail';
import OutcomeImpactDashboard from './pages/OutcomeImpactDashboard';
import TenantAdmin from './pages/TenantAdmin';


// Layout
import AppLayout from './components/layout/AppLayout';

const AuthenticatedApp = () => {
  return (
    <Routes>
      {/* Public — no auth required */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth-redirect" element={<AuthRedirect />} />
      {/* Asset QR scan page — publicly accessible (no login required) */}
      <Route path="/assets/:id" element={<AssetProfilePage />} />
      {/* Legacy redirect */}
      <Route path="/asset-view/:id" element={<Navigate to={window.location.pathname.replace('/asset-view/', '/assets/')} replace />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* ── Dashboards ─────────────────────────────────────────────────────── */}
          <Route path="/dashboard" element={<ModuleGate module="dashboard"><AdminDashboard /></ModuleGate>} />
          <Route path="/tl-dashboard" element={<ModuleGate module="dashboard"><TLDashboard /></ModuleGate>} />
          <Route path="/sw-dashboard" element={<ModuleGate module="dashboard"><SWDashboard /></ModuleGate>} />
          {/* New Manager Dashboard for Team Leader / Team Manager / Regional Manager roles */}
          <Route path="/manager-dashboard" element={<ModuleGate module="dashboard"><UNVSL_Dashboard /></ModuleGate>} />

          {/* Portal roles — no module gate (different auth path) */}
          <Route path="/resident-portal" element={<ResidentPortal />} />
          <Route path="/external-portal" element={<ExternalPortal />} />

          {/* ── Residents ──────────────────────────────────────────────────────── */}
          <Route path="/residents" element={<ModuleGate module="residents"><Residents /></ModuleGate>} />

          {/* Legacy route redirects with service context */}
          <Route path="/18-plus" element={<Navigate to="/residents?service=eighteen_plus" replace />} />
          <Route path="/18-accommodation" element={<Navigate to="/residents?service=eighteen_plus" replace />} />
          <Route path="/24hours" element={<Navigate to="/residents?service=twenty_four_hours" replace />} />
          <Route path="/24-hours-housing" element={<Navigate to="/residents?service=twenty_four_hours" replace />} />
          <Route path="/young-people" element={<Navigate to="/residents?service=all" replace />} />

          <Route path="/visit-reports" element={<ModuleGate module="residents"><VisitReports /></ModuleGate>} />
          <Route path="/visit-reports/new" element={<ModuleGate module="residents"><VisitReportNew /></ModuleGate>} />
          <Route path="/daily-logs" element={<ModuleGate module="residents"><DailyLogs /></ModuleGate>} />
          <Route path="/activities" element={<ModuleGate module="residents"><Activities /></ModuleGate>} />
          <Route path="/risk" element={<ModuleGate module="residents"><RiskManagement /></ModuleGate>} />
          <Route path="/health" element={<ModuleGate module="residents"><Health /></ModuleGate>} />
          <Route path="/education" element={<ModuleGate module="residents"><Education /></ModuleGate>} />
          <Route path="/transitions" element={<ModuleGate module="residents"><Transitions /></ModuleGate>} />
          <Route path="/young-people/:residentId/workspace" element={<ModuleGate module="residents"><YoungPersonWorkspace /></ModuleGate>} />

          {/* ── Staff & HR ─────────────────────────────────────────────────────── */}
          <Route path="/staff" element={<ModuleGate module="staff"><Staff /></ModuleGate>} />
          <Route path="/performance" element={<ModuleGate module="staff"><EmployeePerformance /></ModuleGate>} />
          <Route path="/sw-performance" element={<ModuleGate module="staff"><SWPerformance /></ModuleGate>} />
          <Route path="/my-hr" element={<ModuleGate module="staff"><MyHR /></ModuleGate>} />

          {/* ── Homes ──────────────────────────────────────────────────────────── */}
          <Route path="/handover" element={<ModuleGate module="homes"><HandoverPage /></ModuleGate>} />
          <Route path="/homes-hub" element={<ModuleGate module="homes"><HomesHub /></ModuleGate>} />
          <Route path="/homes" element={<ModuleGate module="homes"><Homes /></ModuleGate>} />
          <Route path="/homes/:id" element={<ModuleGate module="homes"><HomeDetail /></ModuleGate>} />

          {/* ── Finance ────────────────────────────────────────────────────────── */}
          <Route path="/finance" element={<ModuleGate module="finance"><Finance /></ModuleGate>} />
          <Route path="/finance/home/:home_id" element={<ModuleGate module="finance"><FinanceHome /></ModuleGate>} />

          {/* ── Compliance & Governance ────────────────────────────────────────── */}
          <Route path="/compliance-hub" element={<ModuleGate module="compliance"><ComplianceHub /></ModuleGate>} />
          <Route path="/audit-trail" element={<ModuleGate module="compliance"><AuditTrail /></ModuleGate>} />
          <Route path="/outcome-impact" element={<ModuleGate module="compliance"><OutcomeImpactDashboard /></ModuleGate>} />

          {/* ── Approvals / Workflows ──────────────────────────────────────────── */}
          <Route path="/approvals" element={<ModuleGate module="approvals"><Approvals /></ModuleGate>} />
          <Route path="/workflow-command-centre" element={<ModuleGate module="approvals"><WorkflowCommandCentre /></ModuleGate>} />

          {/* ── Maintenance ────────────────────────────────────────────────────── */}
          <Route path="/care-services" element={<ModuleGate module="maintenance"><CareServices /></ModuleGate>} />
          <Route path="/care" element={<ModuleGate module="maintenance"><Care /></ModuleGate>} />
          <Route path="/care/resident/:resident_id" element={<ModuleGate module="residents"><CareResident /></ModuleGate>} />

          {/* ── Admin Management ───────────────────────────────────────────────── */}
          <Route path="/house" element={<ModuleGate module="admin_mgmt"><HouseManagement /></ModuleGate>} />

          {/* ── Analytics (dashboard module) ───────────────────────────────────── */}
          <Route path="/analytics" element={<ModuleGate module="dashboard"><Analytics /></ModuleGate>} />

          {/* ── Settings ───────────────────────────────────────────────────────── */}
          <Route path="/settings" element={<ModuleGate module="settings"><Settings /></ModuleGate>} />

          {/* ── Always accessible (no module gate) ─────────────────────────────── */}
          <Route path="/messages" element={<Messages />} />
          <Route path="/tenant-admin" element={<TenantAdmin />} />

          {/* Legacy shifts redirects */}
          <Route path="/shifts" element={<Navigate to="/residents?service=twenty_four_hours&tab=shifts" replace />} />
          <Route path="/shifts/my-shifts" element={<Navigate to="/residents?service=twenty_four_hours&tab=my-shifts" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <MobileProvider>
              <AuthenticatedApp />
            </MobileProvider>
          </Router>
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
