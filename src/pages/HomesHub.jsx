import { useSearchParams, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import Homes from './Homes';
import ComingSoonTab from '../components/homes/ComingSoonTab';
import HomeChecksTab from '../components/homes/tabs/HomeChecksTab';
import HomeModuleDashboard from '../components/homes/dashboard/HomeModuleDashboard';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ORG_ID } from '@/lib/roleConfig';
import MaintenanceIssuesTab from '../components/homes/tabs/MaintenanceIssuesTab';
import OccupancyFinanceTab from '../components/homes/tabs/OccupancyFinanceTab';
import ComplianceAuditsTab from '../components/homes/tabs/ComplianceAuditsTab';

const ALL_TABS = [
  { key: 'dashboard', label: 'Dashboard', swHidden: true },
  { key: 'my-homes', label: 'My Homes' },
  { key: 'compliance', label: 'Compliance & Audits', swHidden: true },
  { key: 'maintenance', label: 'Maintenance & Issues' },
  { key: 'occupancy', label: 'Occupancy & Finance', swHidden: true },
];

export default function HomesHub() {
  const outletContext = useOutletContext() || {};
  const { user, staffProfile } = outletContext;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const isSupportWorker = staffProfile?.role === 'support_worker';
  const TABS = isSupportWorker ? ALL_TABS.filter(t => !t.swHidden) : ALL_TABS;

  const { data: allHomes = [] } = useQuery({
    queryKey: ['homes'],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: 'active' }),
    staleTime: 5 * 60 * 1000,
  });

  const [selectedHomeIdForChecks, setSelectedHomeIdForChecks] = useState('');
  const visibleHomes = isSupportWorker && staffProfile?.home_ids?.length
    ? allHomes.filter(h => staffProfile.home_ids.includes(h.id))
    : allHomes;
  const selectedHome = visibleHomes.find(h => h.id === selectedHomeIdForChecks) || visibleHomes[0];

  const activeTab = searchParams.get('tab') || (isSupportWorker ? 'my-homes' : 'dashboard');

  const handleTabChange = (tabKey) => setSearchParams({ tab: tabKey }, { replace: true });

  return (
    <div className="space-y-0">
      {/* ── Tab navigation ── */}
      <div className="flex items-center justify-between border-b border-border overflow-x-auto bg-white">
        <div className="flex gap-0 min-w-max">
          {TABS.map(tab => (
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

      {/* ── Tab content ── */}
      <div>
        {activeTab === 'dashboard' && !isSupportWorker && (
          <HomeModuleDashboard staffProfile={staffProfile} user={user} onTabChange={handleTabChange} />
        )}
        {activeTab === 'my-homes' && <Homes />}
        {activeTab === 'compliance' && !isSupportWorker && (
          <ComplianceAuditsTab homes={visibleHomes} staffProfile={staffProfile} />
        )}
        {activeTab === 'maintenance' && (
          <MaintenanceIssuesTab homes={visibleHomes} staffProfile={staffProfile} user={user} />
        )}
        {activeTab === 'occupancy' && !isSupportWorker && (
          <OccupancyFinanceTab homes={visibleHomes} staffProfile={staffProfile} />
        )}
        {/* Legacy operations subtab preserved for SW */}
        {activeTab === 'operations' && (
          <div className="space-y-0">
            <div className="pt-4 px-4 pb-6">
              {visibleHomes.length > 1 && (
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Select Home:</label>
                  <select
                    className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card outline-none focus:ring-1 focus:ring-ring"
                    value={selectedHomeIdForChecks || selectedHome?.id || ''}
                    onChange={e => setSelectedHomeIdForChecks(e.target.value)}
                  >
                    {visibleHomes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
              )}
              {selectedHome
                ? <HomeChecksTab homeId={selectedHomeIdForChecks || selectedHome.id} homeName={selectedHome.name} user={user} staff={[]} />
                : <div className="text-center py-16 text-muted-foreground text-sm">No homes available.</div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}