import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Pages
import Landing from './pages/Landing';
import AuthRedirect from './pages/AuthRedirect';
import AdminDashboard from './pages/AdminDashboard';
import TLDashboard from './pages/TLDashboard';
import SWDashboard from './pages/SWDashboard';
import ResidentPortal from './pages/ResidentPortal';
import ExternalPortal from './pages/ExternalPortal';
import Residents from './pages/Residents';
import VisitReports from './pages/VisitReports';
import VisitReportNew from './pages/VisitReportNew';
import Staff from './pages/Staff';
import DailyLogs from './pages/DailyLogs';
import Activities from './pages/Activities';
import TwentyFourHoursHousing from './pages/24HoursHousing';
import TwentyFourHoursHub from './pages/TwentyFourHoursHub';
import CareServices from './pages/CareServices';
import RiskManagement from './pages/RiskManagement';
import HouseManagement from './pages/HouseManagement';
import Health from './pages/Health';
import Education from './pages/Education';
import Transitions from './pages/Transitions';
import Analytics from './pages/Analytics';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import Homes from './pages/Homes';
import HomeDetail from './pages/HomeDetail';
import HomesHub from './pages/HomesHub';
import EighteenPlus from './pages/18Plus';
import Finance from './pages/Finance';
import FinanceHome from './pages/FinanceHome';
import Care from './pages/Care';
import CareResident from './pages/CareResident';
import Shifts from './pages/Shifts';
import MyShifts from './pages/MyShifts';
import SWPerformance from './pages/SWPerformance';
import MyHR from './pages/MyHR';
import Approvals from './pages/Approvals';
import ComplianceHub from './pages/ComplianceHub';
import YoungPersonWorkspace from './pages/YoungPersonWorkspace';


// Layout
import AppLayout from './components/layout/AppLayout';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth-redirect" element={<AuthRedirect />} />

      {/* Protected — all inside AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/tl-dashboard" element={<TLDashboard />} />
        <Route path="/sw-dashboard" element={<SWDashboard />} />
        <Route path="/resident-portal" element={<ResidentPortal />} />
        <Route path="/external-portal" element={<ExternalPortal />} />
        <Route path="/residents" element={<Residents />} />
        <Route path="/visit-reports" element={<VisitReports />} />
        <Route path="/visit-reports/new" element={<VisitReportNew />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/daily-logs" element={<DailyLogs />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/24-hours-housing" element={<TwentyFourHoursHousing />} />
        <Route path="/24hours" element={<TwentyFourHoursHub />} />
        <Route path="/care-services" element={<CareServices />} />
        <Route path="/risk" element={<RiskManagement />} />
        <Route path="/house" element={<HouseManagement />} />
        <Route path="/health" element={<Health />} />
        <Route path="/education" element={<Education />} />
        <Route path="/transitions" element={<Transitions />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/finance/home/:home_id" element={<FinanceHome />} />
        <Route path="/homes-hub" element={<HomesHub />} />
        <Route path="/homes" element={<Homes />} />
        <Route path="/homes/:id" element={<HomeDetail />} />
        <Route path="/18-plus" element={<EighteenPlus />} />
        <Route path="/care" element={<Care />} />
        <Route path="/care/resident/:resident_id" element={<CareResident />} />
        <Route path="/shifts" element={<Navigate to="/24hours?tab=shifts" replace />} />
        <Route path="/shifts/my-shifts" element={<Navigate to="/24hours?tab=my-shifts" replace />} />
        <Route path="/sw-performance" element={<SWPerformance />} />
        <Route path="/my-hr" element={<MyHR />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/compliance-hub" element={<ComplianceHub />} />
        <Route path="/young-people/:residentId/workspace" element={<YoungPersonWorkspace />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App