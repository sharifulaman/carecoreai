import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const DOC_TYPES = [
  { key: 'gas_safety_expiry', label: 'Gas Safety' },
  { key: 'electrical_cert_expiry', label: 'EICR' },
  { key: 'fire_risk_assessment_expiry', label: 'Fire Risk Assessment' },
  { key: 'epc_expiry', label: 'EPC' },
  { key: 'insurance_expiry', label: 'Insurance' },
  { key: 'pat_testing_expiry', label: 'PAT Testing' },
  { key: 'water_hygiene_expiry', label: 'Water Hygiene' },
];

function getDaysRemaining(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

function getStatus(days) {
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 30) return 'due_soon';
  return 'current';
}

function StatusBadge({ days }) {
  const status = getStatus(days);
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

function formatDays(days) {
  if (days === null) return '—';
  if (days < 0) return `Overdue by ${Math.abs(days)} days`;
  return `${days} days`;
}

export default function ComplianceTable({ homes, expandAll = false }) {
  const navigate = useNavigate();
  const [filterHome, setFilterHome] = useState('all');
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Build flat rows
  let rows = [];
  homes.forEach(home => {
    DOC_TYPES.forEach(doc => {
      const expiry = home[doc.key];
      const days = getDaysRemaining(expiry);
      const status = getStatus(days);
      rows.push({ home, doc, expiry, days, status });
    });
  });

  // Apply filters
  if (filterHome !== 'all') rows = rows.filter(r => r.home.id === filterHome);
  if (filterDocType !== 'all') rows = rows.filter(r => r.doc.key === filterDocType);
  if (filterStatus !== 'all') rows = rows.filter(r => r.status === filterStatus);

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
            value={filterDocType}
            onChange={e => setFilterDocType(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-input bg-transparent"
          >
            <option value="all">All Document Types</option>
            {DOC_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
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
          <p className="text-sm font-medium text-green-700">All compliance documents are up to date.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Home</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Document Type</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Expiry Date</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Days Remaining</th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-xs text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, i) => (
                <tr key={`${row.home.id}-${row.doc.key}`} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{row.home.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.doc.label}</td>
                  <td className="px-4 py-3">
                    {row.expiry ? format(new Date(row.expiry), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className={`px-4 py-3 text-xs font-medium ${
                    row.status === 'expired' ? 'text-red-600' :
                    row.status === 'due_soon' ? 'text-amber-600' : 'text-muted-foreground'
                  }`}>
                    {formatDays(row.days)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge days={row.days} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/homes/${row.home.id}`)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
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
      )}
    </div>
  );
}