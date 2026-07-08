import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { secureGateway } from '@/lib/secureGateway';
import { AlertCircle, CheckCircle2, Clock, Users, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ORG_ID } from '@/lib/roleConfig';

export default function Reg17_18Schedule1Checks({ staffProfile }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterHome, setFilterHome] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [searchName, setSearchName] = useState('');
  const [expandedStaffId, setExpandedStaffId] = useState(null);

  const { data: records = [] } = useQuery({
    queryKey: ['schedule1_checks'],
    queryFn: () => secureGateway.filter('Schedule1CheckRecord', { org_id: ORG_ID, is_deleted: false }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff_list'],
    queryFn: () => secureGateway.filter('StaffProfile', { status: 'active' }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ['homes_list'],
    queryFn: () => secureGateway.filter('Home', { status: 'active' }),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate stat cards
  const stats = useMemo(() => {
    const complete = records.filter(r => r.all_checks_complete).length;
    const incomplete = records.filter(r => !r.all_checks_complete && !r.exceptional_circumstances_applied).length;
    const exceptional = records.filter(r => r.exceptional_circumstances_applied && !r.all_checks_complete).length;
    const dbsExpiring = staffList.filter(s => {
      const dbs = new Date(s.dbs_expiry || '2000-01-01');
      const in90 = new Date(Date.now() + 90 * 86400000);
      return dbs > new Date() && dbs <= in90;
    }).length;
    const probationPending = records.filter(r => r.probation_outcome === 'pending' && r.probation_review_date && new Date(r.probation_review_date) <= new Date(Date.now() + 30 * 86400000)).length;
    const inductionOverdue = records.filter(r => !r.induction_completed && r.employment_start_date && (new Date() - new Date(r.employment_start_date)) > 14 * 86400000).length;

    return { complete, incomplete, exceptional, dbsExpiring, probationPending, inductionOverdue };
  }, [records, staffList]);

  // Filter records
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterStatus !== 'all' && r.record_status !== filterStatus) return false;
      if (filterHome !== 'all' && !(r.home_ids || []).includes(filterHome)) return false;
      if (filterRole !== 'all' && r.staff_role !== filterRole) return false;
      if (searchName && !r.staff_name.toLowerCase().includes(searchName.toLowerCase())) return false;
      return true;
    });
  }, [records, filterStatus, filterHome, filterRole, searchName]);

  const StatusBadge = ({ status }) => {
    const colors = {
      complete: 'bg-green-100 text-green-700',
      incomplete: 'bg-red-100 text-red-700',
      exceptional_circumstances_active: 'bg-amber-100 text-amber-700',
      flagged: 'bg-red-100 text-red-700'
    };
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[status] || 'bg-gray-100'}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const CheckIndicator = ({ completed, expiring }) => {
    if (expiring) return <span className="text-amber-600 text-lg">⚠️</span>;
    if (completed) return <span className="text-green-600 text-lg">✓</span>;
    return <span className="text-red-600 text-lg">✗</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Reg 17 & 18 — Fitness and Employment of Staff (Schedule 1 Checks)</h2>
        <p className="text-sm text-muted-foreground mt-1">All staff must have completed Schedule 1 checks before working with children. Identity and DBS must be complete in all cases.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-xs text-green-700 font-medium">All Checks Complete</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.complete}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-xs text-red-700 font-medium">Checks Incomplete</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.incomplete}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-xs text-amber-700 font-medium">Exceptional Circumstances</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.exceptional}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-xs text-amber-700 font-medium">DBS Expiring in 90 Days</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.dbsExpiring}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <p className="text-xs text-amber-700 font-medium">Probation Pending Review</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.probationPending}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-xs text-red-700 font-medium">Induction Not Completed</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.inductionOverdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="all">All Status</option>
            <option value="complete">Complete</option>
            <option value="incomplete">Incomplete</option>
            <option value="exceptional_circumstances_active">Exceptional</option>
            <option value="flagged">Flagged</option>
          </select>
          <select value={filterHome} onChange={e => setFilterHome(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="all">All Homes</option>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-background">
            <option value="all">All Roles</option>
            <option value="support_worker">Support Worker</option>
            <option value="team_leader">Team Leader</option>
            <option value="team_manager">Team Manager</option>
          </select>
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchName} 
            onChange={e => setSearchName(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background col-span-2"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-xs font-semibold">Staff Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Start Date</th>
              <th className="text-center px-4 py-3 text-xs font-semibold">ID</th>
              <th className="text-center px-4 py-3 text-xs font-semibold">DBS</th>
              <th className="text-center px-4 py-3 text-xs font-semibold">Refs</th>
              <th className="text-center px-4 py-3 text-xs font-semibold">Prev Work</th>
              <th className="text-center px-4 py-3 text-xs font-semibold">Quals</th>
              <th className="text-center px-4 py-3 text-xs font-semibold">Emp Hist</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 cursor-pointer" onClick={() => setExpandedStaffId(expandedStaffId === r.id ? null : r.id)}>
                <td className="px-4 py-3 text-sm font-medium">{r.staff_name}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{r.staff_role}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{r.employment_start_date || '—'}</td>
                <td className="px-4 py-3 text-center"><CheckIndicator completed={r.identity_check_completed} /></td>
                <td className="px-4 py-3 text-center"><CheckIndicator completed={r.dbs_check_completed} expiring={r.dbs_expiry_date && new Date(r.dbs_expiry_date) < new Date(Date.now() + 90 * 86400000)} /></td>
                <td className="px-4 py-3 text-center"><CheckIndicator completed={r.most_recent_employer_reference_obtained} /></td>
                <td className="px-4 py-3 text-center"><CheckIndicator completed={!r.previous_work_with_children_or_vulnerable_adults || r.previous_work_verification_completed} /></td>
                <td className="px-4 py-3 text-center"><CheckIndicator completed={!r.qualifications_required_for_role || r.qualifications_check_completed} /></td>
                <td className="px-4 py-3 text-center"><CheckIndicator completed={r.employment_history_complete} /></td>
                <td className="px-4 py-3"><StatusBadge status={r.record_status} /></td>
                <td className="px-4 py-3"><Button size="sm" variant="outline">View</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-muted-foreground text-sm">No staff records found.</div>
        )}
      </div>
    </div>
  );
}