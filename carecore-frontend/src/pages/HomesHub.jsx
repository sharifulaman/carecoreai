import { useSearchParams, useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { useState } from 'react';
import Homes from './Homes';
import HomeModuleDashboard from '../components/homes/dashboard/HomeModuleDashboard';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ORG_ID } from '@/lib/roleConfig';
import MaintenanceIssuesTab from '../components/homes/tabs/MaintenanceIssuesTab';
import AddHomeModal from '../components/homes/AddHomeModal';

import { secureGateway } from '@/lib/secureGateway';
import { Plus } from 'lucide-react';

const ALL_TABS = [
  { key: 'dashboard', label: 'Dashboard' },
];

export default function HomesHub() {
  const outletContext = useOutletContext() || {};
  const { user, staffProfile } = outletContext;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAddHome, setShowAddHome] = useState(false);

  const isSupportWorker = staffProfile?.role === 'support_worker';
  const TABS = isSupportWorker ? ALL_TABS.filter(t => !t.swHidden) : ALL_TABS;

  const activeTab = searchParams.get('tab') || 'dashboard';

  const { data: allHomes = [] } = useQuery({
    queryKey: ['homes'],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: 'active' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffProfiles = [] } = useQuery({
    queryKey: ['staff-for-homes-hub'],
    queryFn: () => secureGateway.filter('StaffProfile'),
    enabled: !isSupportWorker,
  });

  const { data: myProfile = null } = useQuery({
    queryKey: ['sw-staff-profile-my-homes', user?.email],
    queryFn: () => secureGateway.filter('StaffProfile', { email: user?.email }).then(r => r?.[0] || null),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents-visitor-log'],
    queryFn: () => secureGateway.filter('Resident', { status: 'active' }),
    enabled: activeTab === 'visitor-log',
  });

  const [selectedHomeIdForChecks, setSelectedHomeIdForChecks] = useState('');
  const visibleHomes = isSupportWorker && staffProfile?.home_ids?.length
    ? allHomes.filter(h => staffProfile.home_ids.includes(h.id))
    : allHomes;
  const selectedHome = visibleHomes.find(h => h.id === selectedHomeIdForChecks) || visibleHomes[0];

  const handleTabChange = (tabKey) => setSearchParams({ tab: tabKey }, { replace: true });

  return (
    <div className="space-y-0">
      {showAddHome && (
        <AddHomeModal
          staffProfiles={staffProfiles}
          onClose={() => setShowAddHome(false)}
          onSuccess={() => { setShowAddHome(false); qc.invalidateQueries({ queryKey: ['homes'] }); }}
        />
      )}

      {/* ── Tab content ── */}
      <div>
        {activeTab === 'dashboard' && (
          <HomeModuleDashboard staffProfile={staffProfile} user={user} onTabChange={handleTabChange} />
        )}
        {activeTab === 'maintenance' && (
          <MaintenanceIssuesTab homes={visibleHomes} staffProfile={staffProfile} user={user} />
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
                ? <div className="text-center py-16 text-muted-foreground text-sm">Please use Homes &gt; View Home &gt; Checks, Chores &amp; Audits tab.</div>
                : <div className="text-center py-16 text-muted-foreground text-sm">No homes available.</div>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}