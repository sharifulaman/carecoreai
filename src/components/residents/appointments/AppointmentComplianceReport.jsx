import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Download, X, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const KEY_TYPES = [
  { key: "gp_appointment",      label: "Last GP",       maxDays: 180 },
  { key: "social_worker_visit", label: "Last SW Visit", maxDays: 90  },
  { key: "lac_review",          label: "Last LAC",      maxDays: 90  },
  { key: "iro_review",          label: "Last IRO",      maxDays: 180 },
];

function DaysCell({ days, maxDays }) {
  if (days === null) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Never</span>;
  }
  const color =
    days > maxDays          ? "bg-red-100 text-red-700" :
    days > maxDays * 0.83   ? "bg-amber-100 text-amber-700" :
                              "bg-green-100 text-green-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {days}d ago
    </span>
  );
}

export default function AppointmentComplianceReport({ residents = [], homes = [], onClose }) {
  const [search, setSearch] = useState("");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["compliance-appointments"],
    queryFn: () => secureGateway.filter("Appointment", {}, "-start_datetime", 1000),
    staleTime: 5 * 60 * 1000,
  });

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  const aptCompliance = useMemo(() => {
    if (!appointments.length) return [];
    return residents
      .filter(r => r.status === "active")
      .map(resident => {
        const resApts = appointments.filter(
          a => a.resident_id === resident.id && a.status === "completed" && !a.is_deleted
        );

        const daysSince = (type) => {
          const last = resApts
            .filter(a => a.appointment_type === type)
            .sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))[0];
          if (!last) return null;
          return Math.floor((new Date() - new Date(last.start_datetime)) / 86400000);
        };

        const followUpsPending = appointments.filter(a =>
          a.resident_id === resident.id &&
          a.follow_up_required &&
          !a.follow_up_notes?.trim() &&
          !a.is_deleted
        ).length;

        const days = KEY_TYPES.map(t => daysSince(t.key));
        const isAtRisk = days.some((d, i) => {
          if (KEY_TYPES[i].maxDays === 90) return d === null || d > 90;
          return false;
        });
        const isAmber = !isAtRisk && days.some((d, i) => {
          return d !== null && d > KEY_TYPES[i].maxDays * 0.83;
        });

        return { resident, days, followUpsPending, isAtRisk, isAmber };
      })
      .sort((a, b) => (b.isAtRisk ? 1 : 0) - (a.isAtRisk ? 1 : 0) || (b.isAmber ? 1 : 0) - (a.isAmber ? 1 : 0));
  }, [residents, appointments]);

  const filtered = useMemo(() => {
    if (!search.trim()) return aptCompliance;
    const q = search.toLowerCase();
    return aptCompliance.filter(r =>
      r.resident.display_name?.toLowerCase().includes(q) ||
      homeMap[r.resident.home_id]?.name?.toLowerCase().includes(q)
    );
  }, [aptCompliance, search, homeMap]);

  const exportCSV = () => {
    const header = ["Young Person", "Home", ...KEY_TYPES.map(t => t.label), "Follow-ups Pending", "Status"];
    const rows = filtered.map(({ resident, days, followUpsPending, isAtRisk, isAmber }) => [
      resident.display_name || "",
      homeMap[resident.home_id]?.name || "",
      ...days.map(d => d === null ? "Never" : `${d} days ago`),
      followUpsPending,
      isAtRisk ? "At Risk" : isAmber ? "Review" : "OK",
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Appointment_Compliance_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} residents`);
  };

  const atRiskCount = aptCompliance.filter(r => r.isAtRisk).length;
  const reviewCount = aptCompliance.filter(r => !r.isAtRisk && r.isAmber).length;
  const okCount = aptCompliance.filter(r => !r.isAtRisk && !r.isAmber).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Appointment Compliance Report</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ofsted-ready summary of appointment attendance by resident</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-1"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="flex gap-4 px-6 py-3 bg-gray-50 border-b shrink-0">
          <div className="flex items-center gap-1.5 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-red-700">{atRiskCount}</span>
            <span className="text-gray-500">At Risk</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-amber-700">{reviewCount}</span>
            <span className="text-gray-500">Review Soon</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="font-semibold text-green-700">{okCount}</span>
            <span className="text-gray-500">OK</span>
          </div>
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Search resident or home..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-1 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 px-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">Loading compliance data...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b">
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 whitespace-nowrap">Young Person</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 whitespace-nowrap">Home</th>
                  {KEY_TYPES.map(t => (
                    <th key={t.key} className="text-left py-3 px-3 font-semibold text-gray-600 whitespace-nowrap">{t.label}</th>
                  ))}
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 whitespace-nowrap">Follow-ups</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No active residents found.</td></tr>
                ) : filtered.map(({ resident, days, followUpsPending, isAtRisk, isAmber }) => (
                  <tr key={resident.id} className={`border-b last:border-0 hover:bg-gray-50 ${isAtRisk ? "bg-red-50/40" : ""}`}>
                    <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">{resident.display_name}</td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{homeMap[resident.home_id]?.name || "—"}</td>
                    {KEY_TYPES.map((t, i) => (
                      <td key={t.key} className="py-3 px-3 whitespace-nowrap">
                        <DaysCell days={days[i]} maxDays={t.maxDays} />
                      </td>
                    ))}
                    <td className="py-3 px-3">
                      {followUpsPending > 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{followUpsPending} pending</span>
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {isAtRisk ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> At Risk
                        </span>
                      ) : isAmber ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold w-fit block">
                          Review
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}