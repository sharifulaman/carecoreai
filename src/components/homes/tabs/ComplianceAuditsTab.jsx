import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { format } from "date-fns";
import { ShieldAlert, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function ComplianceAuditsTab({ homes, staffProfile }) {
  const { data: homeDocuments = [] } = useQuery({ queryKey: ["home-documents"], queryFn: () => secureGateway.filter("HomeDocument", {}, "-created_date", 500), staleTime: 3 * 60 * 1000 });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => secureGateway.filter("StaffProfile"), staleTime: 5 * 60 * 1000 });

  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 86400000);
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  const getStatus = (doc) => {
    if (!doc.expiry_date) return "current";
    const exp = new Date(doc.expiry_date);
    if (exp < today) return "expired";
    if (exp <= in90) return "due_soon";
    return "current";
  };

  const complianceItems = [
    ...homeDocuments.map(d => ({ ...d, statusKey: getStatus(d), source: "document" })),
    ...homes.filter(h => h.gas_safety_expiry).map(h => ({ home_id: h.id, document_title: "Gas Safety Certificate", expiry_date: h.gas_safety_expiry, statusKey: getStatus({ expiry_date: h.gas_safety_expiry }), source: "home" })),
    ...homes.filter(h => h.electrical_cert_expiry).map(h => ({ home_id: h.id, document_title: "Electrical Certificate (EICR)", expiry_date: h.electrical_cert_expiry, statusKey: getStatus({ expiry_date: h.electrical_cert_expiry }), source: "home" })),
    ...homes.filter(h => h.fire_risk_assessment_expiry).map(h => ({ home_id: h.id, document_title: "Fire Risk Assessment", expiry_date: h.fire_risk_assessment_expiry, statusKey: getStatus({ expiry_date: h.fire_risk_assessment_expiry }), source: "home" })),
    ...homes.filter(h => h.lease_end).map(h => ({ home_id: h.id, document_title: "Tenancy Lease", expiry_date: h.lease_end, statusKey: getStatus({ expiry_date: h.lease_end }), source: "home" })),
    ...staff.filter(s => s.dbs_expiry).map(s => ({ home_id: (s.home_ids || [])[0], document_title: `DBS — ${s.full_name}`, expiry_date: s.dbs_expiry, statusKey: getStatus({ expiry_date: s.dbs_expiry }), source: "staff" })),
  ];

  const expired = complianceItems.filter(i => i.statusKey === "expired");
  const dueSoon = complianceItems.filter(i => i.statusKey === "due_soon");
  const current = complianceItems.filter(i => i.statusKey === "current");

  const statusConfig = { expired: { label: "Expired", color: "bg-red-100 text-red-700", icon: AlertCircle }, due_soon: { label: "Due Soon", color: "bg-amber-100 text-amber-700", icon: Clock }, current: { label: "Current", color: "bg-green-100 text-green-700", icon: CheckCircle2 } };

  return (
    <div className="p-5 space-y-5">
      <h2 className="text-lg font-bold text-slate-800">Compliance & Audits</h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[["Expired", expired.length, "bg-red-50 border-red-100 text-red-700"], ["Due Soon (90 days)", dueSoon.length, "bg-amber-50 border-amber-100 text-amber-700"], ["Current", current.length, "bg-green-50 border-green-100 text-green-700"]].map(([label, count, cls]) => (
          <div key={label} className={`border rounded-2xl p-5 ${cls}`}>
            <p className="text-3xl font-bold">{count}</p>
            <p className="text-sm font-semibold mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Items table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Document / Item", "Home", "Expiry Date", "Days Remaining", "Status"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>)}</tr>
          </thead>
          <tbody>
            {complianceItems.length === 0
              ? <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">No compliance data found</td></tr>
              : [...expired, ...dueSoon, ...current].map((item, i) => {
                const cfg = statusConfig[item.statusKey];
                const Icon = cfg.icon;
                const days = item.expiry_date ? Math.round((new Date(item.expiry_date) - today) / 86400000) : null;
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                      <Icon className={`w-4 h-4 shrink-0 ${item.statusKey === "expired" ? "text-red-500" : item.statusKey === "due_soon" ? "text-amber-500" : "text-green-500"}`} />
                      {item.document_title || item.document_type || "Document"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{homeMap[item.home_id]?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{item.expiry_date ? format(new Date(item.expiry_date), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{days !== null ? (days < 0 ? <span className="text-red-600">{Math.abs(days)}d overdue</span> : <span className="text-slate-700">{days}d</span>) : "—"}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cfg.color}`}>{cfg.label}</span></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}