import { Building2, ShieldAlert, CreditCard, PoundSterling } from "lucide-react";

const COMPLIANCE_DOC_KEYS = [
  'gas_safety_expiry', 'electrical_cert_expiry', 'fire_risk_assessment_expiry',
  'epc_expiry', 'insurance_expiry', 'pat_testing_expiry', 'water_hygiene_expiry'
];

function getDocStatus(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  const exp = new Date(expiryDate);
  const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expired';
  if (days <= 30) return 'due_soon';
  return 'current';
}

export default function DashboardStatCards({ homes, staffProfiles, onCardClick }) {
  const today = new Date();

  // Compliance alerts
  let complianceAlerts = 0;
  let hasExpired = false;
  let hasExpiringSoon = false;
  homes.forEach(home => {
    COMPLIANCE_DOC_KEYS.forEach(key => {
      const status = getDocStatus(home[key]);
      if (status === 'expired') { complianceAlerts++; hasExpired = true; }
      else if (status === 'due_soon') { complianceAlerts++; hasExpiringSoon = true; }
    });
  });

  // DBS alerts (within 60 days or expired)
  let dbsAlerts = 0;
  let dbsExpired = false;
  let dbsExpiringSoon = false;
  staffProfiles.forEach(sp => {
    if (!sp.dbs_expiry) return;
    const exp = new Date(sp.dbs_expiry);
    const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    if (days < 0) { dbsAlerts++; dbsExpired = true; }
    else if (days <= 60) { dbsAlerts++; dbsExpiringSoon = true; }
  });

  // Rent alerts
  const rentAlerts = homes.filter(h => h.rent_status === 'overdue' || h.rent_status === 'due_soon').length;
  const rentOverdue = homes.some(h => h.rent_status === 'overdue');
  const rentDueSoon = homes.some(h => h.rent_status === 'due_soon');

  const complianceColour = hasExpired
    ? 'bg-red-500/10 text-red-600 border-red-200'
    : hasExpiringSoon ? 'bg-amber-500/10 text-amber-600 border-amber-200'
    : 'bg-green-500/10 text-green-600 border-green-200';

  const dbsColour = dbsExpired
    ? 'bg-red-500/10 text-red-600 border-red-200'
    : dbsExpiringSoon ? 'bg-amber-500/10 text-amber-600 border-amber-200'
    : 'bg-green-500/10 text-green-600 border-green-200';

  const rentColour = rentOverdue
    ? 'bg-red-500/10 text-red-600 border-red-200'
    : rentDueSoon ? 'bg-amber-500/10 text-amber-600 border-amber-200'
    : 'bg-green-500/10 text-green-600 border-green-200';

  const cards = [
    { label: 'Active Homes',         value: homes.length,   icon: Building2,    colour: 'bg-blue-500/10 text-blue-600 border-blue-200',   modalType: 'active_homes' },
    { label: 'Compliance Alerts',    value: complianceAlerts, icon: ShieldAlert, colour: complianceColour,                                  modalType: 'compliance_alerts' },
    { label: 'DBS Alerts',           value: dbsAlerts,      icon: CreditCard,   colour: dbsColour,                                         modalType: 'dbs_alerts' },
    { label: 'Rent Attention Needed',value: rentAlerts,     icon: PoundSterling,colour: rentColour,                                         modalType: 'rent_attention' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <button
            key={card.label}
            onClick={() => onCardClick?.(card.modalType)}
            className={`rounded-xl border p-5 flex items-center gap-4 text-left w-full transition-transform hover:scale-[1.02] hover:shadow-md cursor-pointer ${card.colour}`}
          >
            <div className="rounded-lg p-2 bg-white/50">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{card.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}