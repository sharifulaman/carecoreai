import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3 } from "lucide-react";
import StatCard from "../../dashboard/StatCard";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import EETUpdateModal from "./EETUpdateModal";
import NEETActionPanel from "./NEETActionPanel";

const STATUS_LABELS = {
  employed_full_time: "Employed (Full-Time)",
  employed_part_time: "Employed (Part-Time)",
  self_employed: "Self-Employed",
  education_full_time: "Education (Full-Time)",
  education_part_time: "Education (Part-Time)",
  apprenticeship: "Apprenticeship",
  traineeship: "Traineeship",
  volunteering: "Volunteering",
  caring_responsibilities: "Caring Responsibilities",
  neet: "NEET",
  unknown: "Unknown",
};

const STATUS_CATEGORIES = {
  employed: ["employed_full_time", "employed_part_time", "self_employed"],
  education: ["education_full_time", "education_part_time", "apprenticeship", "traineeship"],
  other: ["volunteering", "caring_responsibilities"],
  neet: ["neet"],
  unknown: ["unknown"],
};

export default function EETTabMain({ residents, homes }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [viewMode, setViewMode] = useState("table");

  const { data: eetRecords = [] } = useQuery({
    queryKey: ["eet-records"],
    queryFn: () => base44.entities.EETRecord.filter({}, "-recorded_date", 500),
  });

  const createEETMutation = useMutation({
    mutationFn: (data) => {
      // Mark previous as not current
      const previous = eetRecords.find(r => r.resident_id === data.resident_id && r.is_current);
      if (previous) {
        base44.entities.EETRecord.update(previous.id, { is_current: false });
      }
      return base44.entities.EETRecord.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eet-records"] });
      setShowModal(false);
      setSelectedResident(null);
    },
  });

  // Get current EET record per resident
  const currentRecords = residents.map(r => {
    const current = eetRecords
      .filter(e => e.resident_id === r.id && e.is_current)
      .sort((a, b) => new Date(b.recorded_date) - new Date(a.recorded_date))[0];
    return {
      resident: r,
      currentRecord: current,
    };
  });

  // Stats
  const employedCount = currentRecords.filter(c => STATUS_CATEGORIES.employed.includes(c.currentRecord?.status)).length;
  const educationCount = currentRecords.filter(c => STATUS_CATEGORIES.education.includes(c.currentRecord?.status)).length;
  const neetCount = currentRecords.filter(c => c.currentRecord?.status === "neet").length;
  const unknownCount = currentRecords.filter(c => !c.currentRecord || c.currentRecord.status === "unknown").length;
  const neetWithPlan = currentRecords.filter(c => c.currentRecord?.status === "neet" && c.currentRecord.action_plan).length;

  // Donut chart data
  const eetBreakdown = [
    { name: "Employed", value: employedCount, fill: "#10b981" },
    { name: "Education/Training", value: educationCount, fill: "#3b82f6" },
    { name: "NEET", value: neetCount, fill: "#ef4444" },
    { name: "Other", value: currentRecords.filter(c => STATUS_CATEGORIES.other.includes(c.currentRecord?.status)).length, fill: "#a855f7" },
    { name: "Unknown", value: unknownCount, fill: "#9ca3af" },
  ].filter(d => d.value > 0);

  // 6-month history
  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

      const employed = eetRecords.filter(e => {
        const rDate = new Date(e.recorded_date);
        return rDate >= monthStart && rDate <= monthEnd && STATUS_CATEGORIES.employed.includes(e.status);
      }).length;
      const education = eetRecords.filter(e => {
        const rDate = new Date(e.recorded_date);
        return rDate >= monthStart && rDate <= monthEnd && STATUS_CATEGORIES.education.includes(e.status);
      }).length;
      const neet = eetRecords.filter(e => {
        const rDate = new Date(e.recorded_date);
        return rDate >= monthStart && rDate <= monthEnd && e.status === "neet";
      }).length;

      months.push({ month, employed, education, neet });
    }
    return months;
  }, [eetRecords]);

  // Table rows
  const tableRows = currentRecords
    .filter(c => c.currentRecord)
    .sort((a, b) => {
      const statusOrder = { neet: 0, unknown: 1, other: 2, education: 3, employed: 4 };
      const aCategory = Object.keys(STATUS_CATEGORIES).find(cat => STATUS_CATEGORIES[cat].includes(a.currentRecord?.status)) || "other";
      const bCategory = Object.keys(STATUS_CATEGORIES).find(cat => STATUS_CATEGORIES[cat].includes(b.currentRecord?.status)) || "other";
      return statusOrder[aCategory] - statusOrder[bCategory];
    });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard title="In Employment" value={employedCount} color="green" />
        <StatCard title="In Education/Training" value={educationCount} color="blue" />
        <StatCard title="NEET" value={neetCount} color={neetCount > 0 ? "red" : "green"} />
        <StatCard title="Unknown Status" value={unknownCount} color="amber" />
        <StatCard title="With Action Plans" value={neetWithPlan} color="purple" />
      </div>

      {/* Action */}
      <Button onClick={() => setShowModal(true)} className="gap-1">
        <Plus className="w-4 h-4" /> Update EET Status
      </Button>

      {/* View toggle */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setViewMode("table")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            viewMode === "table"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Table
        </button>
        <button
          onClick={() => setViewMode("chart")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            viewMode === "chart"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Chart
        </button>
      </div>

      {/* Chart view */}
      {viewMode === "chart" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-4 text-sm">Current EET Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={eetBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {eetBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 6-month trend */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-4 text-sm">6-Month Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="employed" fill="#10b981" name="Employed" />
                  <Bar dataKey="education" fill="#3b82f6" name="Education" />
                  <Bar dataKey="neet" fill="#ef4444" name="NEET" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        <div className="bg-card border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold">Resident</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Employer/Institution</th>
                <th className="text-left px-4 py-3 font-semibold">Role/Course</th>
                <th className="text-left px-4 py-3 font-semibold">Hours/Week</th>
                <th className="text-left px-4 py-3 font-semibold">Since</th>
                <th className="text-left px-4 py-3 font-semibold">Last Updated</th>
                <th className="text-left px-4 py-3 font-semibold">Action Plan</th>
                <th className="text-right px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.resident.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{row.resident.display_name || row.resident.initials}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      row.currentRecord.status === "neet" ? "bg-red-500/10 text-red-600" :
                      STATUS_CATEGORIES.employed.includes(row.currentRecord.status) ? "bg-green-500/10 text-green-600" :
                      STATUS_CATEGORIES.education.includes(row.currentRecord.status) ? "bg-blue-500/10 text-blue-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {STATUS_LABELS[row.currentRecord.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.currentRecord.employer_or_institution || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{row.currentRecord.course_or_role || "—"}</td>
                  <td className="px-4 py-3 text-xs">{row.currentRecord.hours_per_week || "—"}</td>
                  <td className="px-4 py-3 text-xs">{row.currentRecord.start_date ? new Date(row.currentRecord.start_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-xs">{new Date(row.currentRecord.recorded_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs">{row.currentRecord.status === "neet" && row.currentRecord.action_plan ? "Yes" : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedResident(row.resident);
                        setShowModal(true);
                      }}
                      className="h-7 text-xs"
                    >
                      Update
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NEET Action Panel */}
      {neetCount > 0 && (
        <NEETActionPanel
          residents={currentRecords
            .filter(c => c.currentRecord?.status === "neet")
            .map(c => ({ ...c.resident, currentRecord: c.currentRecord }))}
          onUpdate={() => {
            setShowModal(true);
          }}
        />
      )}

      {/* Modal */}
      {showModal && (
        <EETUpdateModal
          resident={selectedResident}
          residents={residents}
          currentRecords={eetRecords}
          onClose={() => {
            setShowModal(false);
            setSelectedResident(null);
          }}
          onSave={(data) => createEETMutation.mutate(data)}
        />
      )}
    </div>
  );
}