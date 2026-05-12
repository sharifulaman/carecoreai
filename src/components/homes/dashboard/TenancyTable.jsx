import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const HOME_TYPE_LABELS = {
  outreach: 'Outreach', '24_hours': '24 Hours', care: 'Care', '18_plus': '18+'
};
const HOME_TYPE_COLOURS = {
  outreach: 'bg-blue-100 text-blue-700',
  '24_hours': 'bg-purple-100 text-purple-700',
  care: 'bg-pink-100 text-pink-700',
  '18_plus': 'bg-teal-100 text-teal-700',
};

function getDays(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(dateStr) - today) / (1000*60*60*24));
}

function getLeaseStatus(days) {
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 90) return 'expiring_soon';
  return 'active';
}

function LeaseBadge({ days }) {
  const s = getLeaseStatus(days);
  if (s === 'expired') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Expired</span>;
  if (s === 'expiring_soon') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3" />Expiring Soon</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" />Active</span>;
}

function RentBadge({ status }) {
  if (status === 'overdue') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" />Overdue</span>;
  if (status === 'due_soon') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3" />Due Soon</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" />Current</span>;
}

function ordinal(n) {
  if (!n) return '—';
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]) + ' of month';
}

export default function TenancyTable({ homes, expandAll = false }) {
  const navigate = useNavigate();
  const [filterRent, setFilterRent] = useState('all');
  const [filterLease, setFilterLease] = useState('all');

  let rows = homes.map(home => {
    const leaseDays = getDays(home.lease_end);
    const leaseStatus = getLeaseStatus(leaseDays);
    return { home, leaseDays, leaseStatus };
  });

  if (filterRent !== 'all') rows = rows.filter(r => r.home.rent_status === filterRent);
  if (filterLease !== 'all') rows = rows.filter(r => r.leaseStatus === filterLease);

  // Sort: overdue rent first, then expiring/expired leases
  const RENT_ORDER = { overdue: 0, due_soon: 1, current: 2 };
  const LEASE_ORDER = { expired: 0, expiring_soon: 1, active: 2, unknown: 3 };
  rows.sort((a, b) => {
    const rd = (RENT_ORDER[a.home.rent_status] ?? 3) - (RENT_ORDER[b.home.rent_status] ?? 3);
    if (rd !== 0) return rd;
    return LEASE_ORDER[a.leaseStatus] - LEASE_ORDER[b.leaseStatus];
  });
  
  const displayRows = expandAll ? rows : rows.slice(0, 10);
  const totalRows = rows.length;

  return (
    <div className="overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex flex-wrap gap-3">
         <select value={filterRent} onChange={e => setFilterRent(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-input bg-transparent">
           <option value="all">All Rent Statuses</option>
           <option value="current">Current</option>
           <option value="due_soon">Due Soon</option>
           <option value="overdue">Overdue</option>
         </select>
         <select value={filterLease} onChange={e => setFilterLease(e.target.value)} className="text-xs px-3 py-1.5 rounded-lg border border-input bg-transparent">
           <option value="all">All Lease Statuses</option>
           <option value="active">Active</option>
           <option value="expiring_soon">Expiring Soon</option>
           <option value="expired">Expired</option>
         </select>
        </div>
        </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Home', 'Type', 'Landlord', 'Monthly Rent', 'Due Day', 'Paid To', 'Lease End', 'Lease Status', 'Rent Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-xs text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map(({ home, leaseDays, leaseStatus }) => (
              <tr key={home.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{home.name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${HOME_TYPE_COLOURS[home.type] || 'bg-slate-100 text-slate-700'}`}>
                    {HOME_TYPE_LABELS[home.type] || home.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{home.landlord_name || '—'}</td>
                <td className="px-4 py-3 font-medium">
                  {home.monthly_rent ? `£${home.monthly_rent.toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{ordinal(home.rent_due_day)}</td>
                <td className="px-4 py-3 text-xs">
                  {home.rent_paid_to_date ? format(new Date(home.rent_paid_to_date), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {home.lease_end ? (
                    <span>
                      {format(new Date(home.lease_end), 'dd/MM/yyyy')}
                      <span className="ml-1 text-muted-foreground">
                        ({leaseDays !== null ? (leaseDays < 0 ? `${Math.abs(leaseDays)}d ago` : `${leaseDays}d`) : '—'})
                      </span>
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3"><LeaseBadge days={leaseDays} /></td>
                <td className="px-4 py-3"><RentBadge status={home.rent_status} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigate(`/homes/${home.id}`)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    View Home <ChevronRight className="w-3 h-3" />
                  </button>
                </td>
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
            </div>
            );
            }