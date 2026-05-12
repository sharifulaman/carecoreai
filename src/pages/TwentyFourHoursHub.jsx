import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ORG_ID } from '@/lib/roleConfig';
import { base44 } from '@/api/base44Client';
import { BarChart3 } from 'lucide-react';
import Shifts from './Shifts';
import MyShifts from './MyShifts';
import HandoversTab from '@/components/shifts/HandoversTab';
import SleepCheckTab from '@/components/shifts/SleepCheckTab';
import VisitorLogTab from '@/components/homes/tabs/VisitorLogTab';
import HomeChecksTab from '@/components/homes/tabs/HomeChecksTab';
import SignificantEventsTab from '@/components/homes/tabs/SignificantEventsTab';
import Reg44Tab from '@/components/homes/tabs/Reg44Tab';
import OfstedNotificationsTab from '@/components/homes/tabs/OfstedNotificationsTab';
import Reg45GeneratorTab from '@/components/homes/tabs/Reg45GeneratorTab';
import OutreachDashboardTab from '@/components/outreach/OutreachDashboardTab';
import TwentyFourHoursOverview from '@/components/compliance/TwentyFourHoursOverview';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'shifts', label: 'Shifts & Rota' },
  { key: 'my-shifts', label: 'My Shifts' },
  { key: 'handovers', label: 'Shift Handovers' },
  { key: 'sleep-checks', label: 'Sleep Checks' },
  { key: 'visitors', label: 'Visitor Log' },
  { key: 'home-checks', label: 'Home Checks' },
  { key: 'significant-events', label: 'Significant Events' },
];

const OUTREACH_TABS = [
  { key: 'outreach', label: 'Outreach Management' },
];

const ADMIN_TABS = [
  { key: 'reg44', label: '🛡️ Regulation 44' },
  { key: 'ofsted-notifications', label: 'Ofsted Notifications' },
  { key: 'reg45', label: 'Annual Review (Reg45)' },
];

export default function TwentyFourHoursHub() {
  const outletContext = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const today = new Date().toISOString().split('T')[0];

  const { data: homes = [] } = useQuery({
    queryKey: ['homes-24hr'],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, type: '24_hours' }),
  });

  const { data: staffProfile } = useQuery({
    queryKey: ["staff-profile", outletContext?.user?.id],
    queryFn: () => outletContext?.user?.id ? base44.entities.StaffProfile.filter({ user_id: outletContext?.user?.id }) : null,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff-24hr'],
    queryFn: () => base44.entities.StaffProfile.filter({}, '-created_date', 50),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-24hr'],
    queryFn: () => base44.entities.Resident.filter({ status: 'active' }, '-created_date', 100),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-24hr', today],
    queryFn: () => base44.entities.Shift.filter({ date: today }, '-created_date', 100),
  });

  const { data: handovers = [] } = useQuery({
    queryKey: ['handovers-24hr', today],
    queryFn: () => base44.entities.ShiftHandover.filter({ date: today }, '-created_date', 100),
  });

  const { data: visitorLogs = [] } = useQuery({
    queryKey: ['visitor-logs-24hr', today],
    queryFn: () => base44.entities.VisitorLog.filter({ visit_date: today }, '-created_date', 100),
  });

  const { data: significantEvents = [] } = useQuery({
    queryKey: ['sig-events-24hr'],
    queryFn: () => base44.entities.SignificantEvent.filter({}, '-event_datetime', 100),
  });

  const { data: mfhRecords = [] } = useQuery({
    queryKey: ['mfh-24hr'],
    queryFn: () => base44.entities.MissingFromHome.filter({ status: 'active' }, '-reported_missing_datetime', 50),
  });

  const { data: sleepChecks = [] } = useQuery({
    queryKey: ['sleep-checks-24hr', today],
    queryFn: () => base44.entities.SleepCheckLog.filter({ date: today }, '-created_date', 100),
  });

  const { data: homeChecks = [] } = useQuery({
    queryKey: ['home-checks-24hr', today],
    queryFn: () => base44.entities.HomeCheck.filter({ check_date: today }, '-created_date', 100),
  });

  const { data: reg44Reports = [] } = useQuery({
    queryKey: ['reg44-24hr'],
    queryFn: () => base44.entities.Reg44Report.filter({}, '-visit_date', 100),
  });

  const isAdmin = outletContext?.user?.role === 'admin' || staffProfile?.[0]?.role === 'admin';

  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey }, { replace: true });
  };

  const roleDisplay = (() => {
    const role = outletContext?.user?.role;
    if (role === 'user') return 'support worker';
    return (role || 'support_worker').replace(/_/g, ' ');
  })();

  const isOutreach = homes.some(h => h.type === 'outreach');
  const visibleTabs = [...TABS, ...(isOutreach ? OUTREACH_TABS : []), ...(isAdmin ? ADMIN_TABS : [])];

  return (
    <div className="space-y-0" {...outletContext}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">24 Hours Housing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {homes.length} home{homes.length !== 1 ? 's' : ''} · {roleDisplay} view
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex items-center border-b border-border overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'dashboard' && (
          <TwentyFourHoursOverview 
            homes={homes.filter(h => h.type === '24_hours')} 
            staff={staff}
            data={{
              shifts,
              handovers,
              mfhRecords,
              sleepChecks,
              visitorLogs,
              significantEvents,
              residents,
              attendanceLogs: [],
            }}
          />
        )}

        {activeTab === 'shifts' && <Shifts />}

        {activeTab === 'my-shifts' && <MyShifts />}

        {activeTab === 'handovers' && homes.map(home => {
          const homeResidents = residents.filter(r => r.home_id === home.id);
          return (
            <div key={home.id} className="mt-4">
              <h2 className="text-lg font-bold mb-3">{home.name}</h2>
              <HandoversTab home={home} handovers={handovers.filter(h => h.home_id === home.id)} residents={homeResidents} staff={staff} user={outletContext?.user} />
            </div>
          );
        })}

        {activeTab === 'sleep-checks' && homes.map(home => (
          <div key={home.id} className="mt-4">
            <h2 className="text-lg font-bold mb-3">{home.name}</h2>
            <SleepCheckTab home={home} sleepChecks={sleepChecks.filter(s => s.home_id === home.id)} staff={staff} user={outletContext?.user} />
          </div>
        ))}

        {activeTab === 'visitors' && homes.map(home => (
          <div key={home.id} className="mt-4">
            <h2 className="text-lg font-bold mb-3">{home.name}</h2>
            <VisitorLogTab home={home} visitorLogs={visitorLogs.filter(v => v.home_id === home.id)} residents={residents} staff={staff} user={outletContext?.user} />
          </div>
        ))}

        {activeTab === 'home-checks' && homes.map(home => (
          <div key={home.id} className="mt-4">
            <h2 className="text-lg font-bold mb-3">{home.name}</h2>
            <HomeChecksTab home={home} homeChecks={homeChecks.filter(c => c.home_id === home.id)} staff={staff} user={outletContext?.user} />
          </div>
        ))}

        {activeTab === 'significant-events' && homes.map(home => {
          const homeResidents = residents.filter(r => r.home_id === home.id);
          return (
            <div key={home.id} className="mt-4">
              <h2 className="text-lg font-bold mb-3">{home.name}</h2>
              <SignificantEventsTab home={home} significantEvents={significantEvents.filter(e => e.home_id === home.id)} residents={homeResidents} staff={staff} user={outletContext?.user} />
            </div>
          );
        })}

        {activeTab === 'reg44' && isAdmin && homes.map(home => (
          <div key={home.id} className="mt-4">
            <h2 className="text-lg font-bold mb-3">{home.name}</h2>
            <Reg44Tab home={home} reg44Reports={reg44Reports.filter(r => r.home_id === home.id)} staff={staff} user={outletContext?.user} />
          </div>
        ))}

        {activeTab === 'ofsted-notifications' && isAdmin && homes.map(home => (
          <div key={home.id} className="mt-4">
            <h2 className="text-lg font-bold mb-3">{home.name}</h2>
            <OfstedNotificationsTab home={home} ofstedNotifications={significantEvents.filter(e => e.home_id === home.id)} staff={staff} user={outletContext?.user} />
          </div>
        ))}

        {activeTab === 'reg45' && isAdmin && homes.map(home => (
          <div key={home.id} className="mt-4">
            <h2 className="text-lg font-bold mb-3">{home.name}</h2>
            <Reg45GeneratorTab home={home} user={outletContext?.user} />
          </div>
        ))}

        {activeTab === 'outreach' && homes.filter(h => h.type === 'outreach').map(home => (
          <div key={home.id} className="mt-4">
            <h2 className="text-lg font-bold mb-3">{home.name}</h2>
            <OutreachDashboardTab home={home} staff={[]} user={outletContext?.user} />
          </div>
        ))}
      </div>
    </div>
  );
}