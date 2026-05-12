import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import HomeCheckForm from "./HomeCheckForm";

const CHECKLISTS = {
  daily: [
    "Fire exits clear and unlocked",
    "Smoke alarms tested",
    "All residents accounted for",
    "Medication storage locked",
    "First aid kit accessible and stocked",
    "CCTV operational (if applicable)",
    "Any maintenance issues noted",
    "Property secure",
  ],
  weekly: [
    "Fridge temperatures within range",
    "Food storage appropriate",
    "Cleaning standards acceptable",
    "Bedroom checks completed",
    "Common areas clean and safe",
    "Garden/outdoor areas safe",
    "All fire extinguishers in place",
    "Window restrictions in place",
  ],
  monthly: [
    "Full fire safety check",
    "Emergency lighting tested",
    "PAT testing schedule reviewed",
    "RIDDOR checks",
    "Infection control review",
    "Risk assessment review",
    "Staff training compliance reviewed",
  ],
};

function getCheckDueDate(checkType, lastCheck) {
  if (!lastCheck) return "Overdue";
  const days = { daily: 1, weekly: 7, monthly: 30 }[checkType] || 1;
  const dueDate = new Date(lastCheck.check_date);
  dueDate.setDate(dueDate.getDate() + days);
  const now = new Date();
  if (now > dueDate) return "Overdue";
  const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  return `Due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`;
}

export default function HomeChecksTab({ home, staff, user }) {
  const qc = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(null);

  const { data: checks = [] } = useQuery({
    queryKey: ["home-checks", home?.id],
    queryFn: () => secureGateway.filter("HomeCheck", { home_id: home?.id }, "-check_date", 500),
  });

  const lastChecks = useMemo(() => {
    const last = { daily: null, weekly: null, monthly: null };
    checks.forEach(c => {
      if (!last[c.check_type]) last[c.check_type] = c;
    });
    return last;
  }, [checks]);

  const monthChecks = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    return checks.filter(c => c.check_date?.startsWith(`${year}-${month}`)).sort((a, b) => (b.check_date || "").localeCompare(a.check_date || ""));
  }, [checks, selectedMonth]);

  return (
    <div className="space-y-4">
      {/* Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["daily", "weekly", "monthly"].map(type => (
          <div key={type} className="border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm capitalize">{type} Checks</h3>
              {lastChecks[type]?.overall_result === "pass" && <CheckCircle className="w-4 h-4 text-green-600" />}
              {lastChecks[type]?.overall_result === "fail" && <AlertTriangle className="w-4 h-4 text-red-600" />}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {lastChecks[type] ? `Last: ${lastChecks[type].check_date} · ${getCheckDueDate(type, lastChecks[type])}` : "Never completed"}
            </p>
            <Button onClick={() => setShowForm(type)} size="sm" className="w-full gap-1">
              <Plus className="w-3 h-3" /> Complete {type}
            </Button>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Compliance Calendar</h3>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-2 py-1 border border-border rounded text-sm" />
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-xs font-medium text-center p-1">{d}</div>
          ))}
          {Array.from({ length: 31 }).map((_, i) => {
            const day = String(i + 1).padStart(2, "0");
            const date = `${selectedMonth}-${day}`;
            const dayChecks = monthChecks.filter(c => c.check_date === date);
            const hasPass = dayChecks.some(c => c.overall_result === "pass");
            const hasFail = dayChecks.some(c => c.overall_result === "fail");

            if (new Date(`${date}T00:00`) > new Date()) return <div key={i} className="p-1" />;

            return (
              <div
                key={i}
                className={`p-1 rounded text-xs text-center font-medium cursor-pointer ${
                  hasFail ? "bg-red-200 text-red-700" : hasPass ? "bg-green-200 text-green-700" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>

        {/* Recent Checks */}
        {monthChecks.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {monthChecks.slice(0, 10).map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                <div>
                  <p className="font-medium capitalize">{c.check_type} - {c.check_date}</p>
                  <p className="text-muted-foreground">by {c.checked_by_name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${c.overall_result === "pass" ? "bg-green-100 text-green-700" : c.overall_result === "fail" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {c.overall_result}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <HomeCheckForm
          checkType={showForm}
          checklist={CHECKLISTS[showForm]}
          home={home}
          user={user}
          onClose={() => setShowForm(null)}
          onSave={() => {
            qc.invalidateQueries({ queryKey: ["home-checks"] });
            setShowForm(null);
          }}
        />
      )}
    </div>
  );
}