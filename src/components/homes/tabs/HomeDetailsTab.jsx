import { Building2, MapPin, Phone, Mail, Users, Shield } from "lucide-react";

const FIELD = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
  </div>
);

export default function HomeDetailsTab({ home, residents, staff }) {
  const tl = staff.find(s => s.id === home.team_leader_id);
  const tlList = (home.team_leader_ids || []).map(id => staff.find(s => s.id === id)?.full_name).filter(Boolean);
  const swList = (home.support_worker_ids || []).map(id => staff.find(s => s.id === id)?.full_name).filter(Boolean);
  const homeResidents = residents.filter(r => r.home_id === home.id);
  const riskFlags = homeResidents.filter(r => r.risk_level === "high" || r.risk_level === "critical");

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Residents", value: homeResidents.length, color: "bg-primary/10 text-primary" },
          { label: "Risk Flags", value: riskFlags.length, color: riskFlags.length > 0 ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600" },
          { label: "Support Workers", value: swList.length, color: "bg-blue-500/10 text-blue-600" },
          { label: "Team Leaders", value: tlList.length || (tl ? 1 : 0), color: "bg-purple-500/10 text-purple-600" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Details grid */}
      <div className="bg-card rounded-xl border border-border p-5 grid sm:grid-cols-2 gap-x-8 gap-y-5">
        <FIELD label="Home Name" value={home.name} />
        <FIELD label="Home Type" value={{ outreach: "Outreach", "24_hours": "24 Hours Housing", care: "Care Services", "18_plus": "18+ Accommodation" }[home.type] || home.type?.replace(/_/g, " ")} />
        <FIELD label="Care Model" value={home.care_model} />
        <FIELD label="Compliance Framework" value={home.compliance_framework?.toUpperCase()} />
        <FIELD label="Address" value={home.address} />
        <FIELD label="Postcode" value={home.postcode} />
        <FIELD label="Phone" value={home.phone} />
        <FIELD label="Email" value={home.email} />
        <FIELD label="Status" value={home.status} />
        <FIELD label="Primary Team Leader" value={tl?.full_name} />
      </div>

      {/* Staff */}
      {(swList.length > 0 || tlList.length > 0) && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h3 className="font-semibold text-sm">Assigned Staff</h3>
          {tlList.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Team Leaders</p>
              <div className="flex flex-wrap gap-2">
                {tlList.map(name => (
                  <span key={name} className="text-xs bg-purple-500/10 text-purple-700 px-2.5 py-1 rounded-lg font-medium">{name}</span>
                ))}
              </div>
            </div>
          )}
          {swList.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Support Workers</p>
              <div className="flex flex-wrap gap-2">
                {swList.map(name => (
                  <span key={name} className="text-xs bg-blue-500/10 text-blue-700 px-2.5 py-1 rounded-lg font-medium">{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Residents */}
      {homeResidents.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="font-semibold text-sm">Current Residents</h3>
          <div className="space-y-2">
            {homeResidents.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <p className="text-sm font-medium">{r.display_name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                  r.risk_level === "high" ? "bg-red-500/10 text-red-600" :
                  r.risk_level === "critical" ? "bg-red-700/10 text-red-700" :
                  r.risk_level === "medium" ? "bg-amber-500/10 text-amber-600" :
                  "bg-green-500/10 text-green-600"
                }`}>{r.risk_level || "low"} risk</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}