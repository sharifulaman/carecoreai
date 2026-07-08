import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, ShieldAlert, CreditCard, PoundSterling, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const COMPLIANCE_DOC_LABELS = {
  gas_safety_expiry: 'Gas Safety',
  electrical_cert_expiry: 'EICR / Electrical',
  fire_risk_assessment_expiry: 'Fire Risk Assessment',
  epc_expiry: 'EPC',
  insurance_expiry: 'Insurance',
  pat_testing_expiry: 'PAT Testing',
  water_hygiene_expiry: 'Water Hygiene',
};

function docStatus(expiryDate) {
  if (!expiryDate) return null;
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return { label: 'Expired', colour: 'bg-red-100 text-red-700', days };
  if (days <= 30) return { label: 'Due Soon', colour: 'bg-amber-100 text-amber-700', days };
  return null; // only show alerts
}

function dbsStatus(dbs_expiry) {
  if (!dbs_expiry) return null;
  const days = differenceInDays(new Date(dbs_expiry), new Date());
  if (days < 0) return { label: 'Expired', colour: 'bg-red-100 text-red-700', days };
  if (days <= 60) return { label: 'Due Soon', colour: 'bg-amber-100 text-amber-700', days };
  return null;
}

// ── Active Homes ─────────────────────────────────────────────────────────────
function ActiveHomesModal({ homes }) {
  return (
    <>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {homes.map(h => (
          <div key={h.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.address}</p>
              </div>
            </div>
            <Badge variant="outline" className="capitalize text-xs">{h.type?.replace('_', ' ')}</Badge>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Compliance Alerts ────────────────────────────────────────────────────────
function ComplianceAlertsModal({ homes }) {
  const rows = [];
  homes.forEach(home => {
    Object.entries(COMPLIANCE_DOC_LABELS).forEach(([key, label]) => {
      const st = docStatus(home[key]);
      if (st) rows.push({ home, key, label, st, expiry: home[key] });
    });
  });
  rows.sort((a, b) => a.st.days - b.st.days);

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No compliance alerts</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium">{r.home.name}</p>
            <p className="text-xs text-muted-foreground">{r.label} · Expires {format(new Date(r.expiry), 'dd MMM yyyy')}</p>
          </div>
          <Badge className={`${r.st.colour} border-0 text-xs`}>
            {r.st.label} {r.st.days < 0 ? `(${Math.abs(r.st.days)}d ago)` : `(${r.st.days}d)`}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ── DBS Alerts ───────────────────────────────────────────────────────────────
function DBSAlertsModal({ staffProfiles, homes }) {
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h.name]));
  const rows = staffProfiles
    .map(sp => ({ sp, st: dbsStatus(sp.dbs_expiry) }))
    .filter(r => r.st !== null)
    .sort((a, b) => a.st.days - b.st.days);

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No DBS alerts</p>}
      {rows.map(({ sp, st }, i) => {
        const homeNames = (sp.home_ids || []).map(id => homeMap[id]).filter(Boolean).join(', ') || '—';
        return (
          <div key={i} className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-sm font-medium">{sp.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{sp.role?.replace('_', ' ')} · {homeNames}</p>
              {sp.dbs_expiry && <p className="text-xs text-muted-foreground">Expires {format(new Date(sp.dbs_expiry), 'dd MMM yyyy')}</p>}
            </div>
            <Badge className={`${st.colour} border-0 text-xs`}>
              {st.label} {st.days < 0 ? `(${Math.abs(st.days)}d ago)` : `(${st.days}d)`}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

// ── Rent Attention ───────────────────────────────────────────────────────────
function RentAttentionModal({ homes }) {
  const rows = homes
    .filter(h => h.rent_status === 'overdue' || h.rent_status === 'due_soon')
    .sort((a, b) => (a.rent_status === 'overdue' ? -1 : 1));

  const colours = {
    overdue: 'bg-red-100 text-red-700',
    due_soon: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {rows.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No rent issues</p>}
      {rows.map(h => (
        <div key={h.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p className="text-sm font-medium">{h.name}</p>
            <p className="text-xs text-muted-foreground">{h.address}</p>
            <p className="text-xs text-muted-foreground">
              £{h.monthly_rent?.toLocaleString()}/mo
              {h.rent_paid_to_date && ` · Paid to ${format(new Date(h.rent_paid_to_date), 'dd MMM yyyy')}`}
            </p>
          </div>
          <Badge className={`${colours[h.rent_status]} border-0 text-xs capitalize`}>
            {h.rent_status?.replace('_', ' ')}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
const MODAL_CONFIG = {
  active_homes:        { title: 'Active Homes',        icon: Building2 },
  compliance_alerts:   { title: 'Compliance Alerts',   icon: ShieldAlert },
  dbs_alerts:          { title: 'DBS Alerts',          icon: CreditCard },
  rent_attention:      { title: 'Rent Attention Needed', icon: PoundSterling },
};

export default function StatCardModal({ type, homes, staffProfiles, onClose }) {
  if (!type) return null;
  const cfg = MODAL_CONFIG[type];
  const Icon = cfg.icon;

  return (
    <Dialog open={!!type} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {cfg.title}
          </DialogTitle>
        </DialogHeader>
        {type === 'active_homes'      && <ActiveHomesModal homes={homes} />}
        {type === 'compliance_alerts' && <ComplianceAlertsModal homes={homes} />}
        {type === 'dbs_alerts'        && <DBSAlertsModal staffProfiles={staffProfiles} homes={homes} />}
        {type === 'rent_attention'    && <RentAttentionModal homes={homes} />}
      </DialogContent>
    </Dialog>
  );
}