import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { format, addMonths, startOfMonth } from "date-fns";

const COMPLIANCE_DOC_KEYS = [
  { key: 'gas_safety_expiry', label: 'Gas Safety' },
  { key: 'electrical_cert_expiry', label: 'EICR' },
  { key: 'fire_risk_assessment_expiry', label: 'Fire Risk' },
  { key: 'epc_expiry', label: 'EPC' },
  { key: 'insurance_expiry', label: 'Insurance' },
  { key: 'pat_testing_expiry', label: 'PAT' },
  { key: 'water_hygiene_expiry', label: 'Water Hygiene' },
];

function getDays(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(dateStr) - today) / (1000*60*60*24));
}

function getStatus(days) {
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 30) return 'due_soon';
  return 'current';
}

// Chart 1: Compliance health per home (stacked bar)
function ComplianceHealthChart({ homes }) {
  const data = homes.map(home => {
    let current = 0, due_soon = 0, expired = 0;
    COMPLIANCE_DOC_KEYS.forEach(({ key }) => {
      const s = getStatus(getDays(home[key]));
      if (s === 'current') current++;
      else if (s === 'due_soon') due_soon++;
      else if (s === 'expired') expired++;
    });
    const total = current + due_soon + expired || 1;
    return {
      name: home.name.length > 14 ? home.name.slice(0, 14) + '…' : home.name,
      fullName: home.name,
      current: Math.round((current / total) * 100),
      due_soon: Math.round((due_soon / total) * 100),
      expired: Math.round((expired / total) * 100),
      currentCount: current, dueSoonCount: due_soon, expiredCount: expired,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
        <p className="font-medium mb-1">{d?.fullName}</p>
        <p className="text-green-600">✓ {d?.currentCount} current</p>
        <p className="text-amber-600">⚠ {d?.dueSoonCount} due soon</p>
        <p className="text-red-600">✗ {d?.expiredCount} expired</p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-4">Compliance Health by Home</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, homes.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
          <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="current" stackId="a" fill="#22c55e" name="Current" />
          <Bar dataKey="due_soon" stackId="a" fill="#f59e0b" name="Due Soon" />
          <Bar dataKey="expired" stackId="a" fill="#ef4444" name="Expired" radius={[0, 4, 4, 0]} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Chart 2: Upcoming expiries by month
function ExpiryTimelineChart({ homes }) {
  const today = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = startOfMonth(addMonths(today, i));
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy'), count: 0, docs: [] };
  });
  const monthMap = Object.fromEntries(months.map(m => [m.key, m]));

  homes.forEach(home => {
    COMPLIANCE_DOC_KEYS.forEach(({ key, label }) => {
      if (!home[key]) return;
      const exp = new Date(home[key]);
      const mk = format(startOfMonth(exp), 'yyyy-MM');
      if (monthMap[mk]) {
        monthMap[mk].count++;
        monthMap[mk].docs.push(`${home.name}: ${label}`);
      }
    });
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const m = monthMap[months.find(m => m.label === label)?.key];
    return (
      <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg max-w-xs">
        <p className="font-medium mb-1">{label} — {m?.count || 0} expir{m?.count === 1 ? 'y' : 'ies'}</p>
        {m?.docs.map((d, i) => <p key={i} className="text-muted-foreground">{d}</p>)}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold text-sm mb-4">Document Expiries — Next 12 Months</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={months.map(m => ({ name: m.label, count: m.count }))}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Expiries" radius={[4, 4, 0, 0]}>
            {months.map((m, i) => (
              <Cell key={i} fill={m.count === 0 ? '#e2e8f0' : i < 1 ? '#ef4444' : i < 2 ? '#f59e0b' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Chart 3: Monthly rent by home
function RentChart({ homes }) {
  const rentHomes = homes.filter(h => h.monthly_rent);
  const total = rentHomes.reduce((s, h) => s + (h.monthly_rent || 0), 0);

  const RENT_COLOUR = { current: '#22c55e', due_soon: '#f59e0b', overdue: '#ef4444' };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
        <p className="font-medium">{d.fullName}</p>
        <p>Rent: £{d.rent?.toLocaleString()}/mo</p>
        <p>Landlord: {d.landlord || '—'}</p>
        <p>Status: <span className="capitalize">{d.status?.replace('_', ' ')}</span></p>
      </div>
    );
  };

  const data = rentHomes.map(h => ({
    name: h.name.length > 12 ? h.name.slice(0, 12) + '…' : h.name,
    fullName: h.name, rent: h.monthly_rent,
    landlord: h.landlord_name, status: h.rent_status,
    fill: RENT_COLOUR[h.rent_status] || '#94a3b8',
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Monthly Rent by Home</h3>
        <span className="text-sm font-semibold text-primary">Total: £{total.toLocaleString()}/mo</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ bottom: 16 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
          <YAxis tickFormatter={v => `£${v.toLocaleString()}`} tick={{ fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="rent" name="Monthly Rent" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function HomesDashboardCharts({ homes }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceHealthChart homes={homes} />
        <ExpiryTimelineChart homes={homes} />
      </div>
      <RentChart homes={homes} />
    </div>
  );
}