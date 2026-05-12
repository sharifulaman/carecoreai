import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { format } from "date-fns";

function getDaysRemaining(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

function getDBSStatus(days) {
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 60) return 'due_soon';
  return 'current';
}

function StatusBadge({ days }) {
  const status = getDBSStatus(days);
  if (status === 'expired') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <XCircle className="w-3 h-3" /> Expired
    </span>
  );
  if (status === 'due_soon') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <AlertTriangle className="w-3 h-3" /> Due Soon
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle2 className="w-3 h-3" /> Current
    </span>
  );
}

function RoleBadge({ role }) {
  const map = {
    admin: 'bg-purple-100 text-purple-700',
    team_leader: 'bg-blue-100 text-blue-700',
    support_worker: 'bg-slate-100 text-slate-700',
  };
  const labels = { admin: 'Admin', team_leader: 'Team Leader', support_worker: 'Support Worker' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[role] || map.support_worker}`}>
      {labels[role] || role}
    </span>
  );
}

function maskDBS(number) {
  if (!number || number.length < 6) return number || '—';
  return number.slice(0, 3) + '***' + number.slice(-3);
}

function formatDays(days) {
  if (days === null) return '—';
  if (days < 0) return `Overdue by ${Math.abs(days)} days`;
  return `${days} days`;
}

export default function DBSTable({ staffProfiles, homes, expandAll = false }) {
  const navigate = useNavigate();
  const [filterHome, setFilterHome] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h.name]));

  let rows = staffProfiles.map(sp => {
    const days = getDaysRemaining(sp.dbs_expiry);
    const status = getDBSStatus(days);
    const assignedHomeNames = (sp.home_ids || []).map(id => homeMap[id]).filter(Boolean);
    return { sp, days, status, assignedHomeNames };
  });

  if (filterHome !== 'all') {
    rows = rows.filter(r => (r.sp.home_ids || []).includes(filterHome));
  }
  if (filterStatus !== 'all') {
    rows = rows.filter(r => r.status === filterStatus);
  }

  // Sort: expired → due_soon → current
  const ORDER = { expired: 0, due_soon: 1, current: 2, unknown: 3 };
  rows.sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.days ?? 999) - (b.days ?? 999));
  
  const displayRows = expandAll ? rows : rows.slice(0, 10);
  const totalRows = rows.length;

  return (
    <div className="overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterHome}
            onChange={e => setFilterHome(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-input bg-transparent"
          >
            <option value="all">All Homes</option>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-input bg-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="current">Current</option>
            <option value="due_soon">Due Soon</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
          <p className="text-sm font-medium text-green-700">All staff DBS records are current.</p>
        </div>
      ) : (
       <div className="overflow-x-auto">
         <table className="w-full text-sm">
           <thead>
             <tr className="border-b border-border bg-muted/30">
               <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Staff Name</th>
               <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Role</th>
               <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Assigned Home(s)</th>
               <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">DBS Number</th>
               <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Expiry Date</th>
               <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Days Remaining</th>
               <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Status</th>
             </tr>
           </thead>
           <tbody>
             {displayRows.map(({ sp, days, status, assignedHomeNames }) => (
                <tr
                  key={sp.id}
                  className="border-b border-border/50 last:border-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate('/staff')}
                >
                  <td className="px-4 py-3 font-medium">{sp.full_name}</td>
                  <td className="px-4 py-3"><RoleBadge role={sp.role} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {assignedHomeNames.length ? assignedHomeNames.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{maskDBS(sp.dbs_number)}</td>
                  <td className="px-4 py-3">
                    {sp.dbs_expiry ? format(new Date(sp.dbs_expiry), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${
                    status === 'expired' ? 'text-red-600' :
                    status === 'due_soon' ? 'text-amber-600' : 'text-muted-foreground'
                  }`}>
                    {formatDays(days)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge days={days} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalRows > 10 && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground bg-muted/20">
              Showing top 10 of {totalRows} items
            </div>
          )}
        </div>
      )}
    </div>
  );
}