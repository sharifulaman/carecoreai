import { useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from "recharts";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import StatCard from "../dashboard/StatCard";

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function EighteenPlusOverview({ residents, homes, staff, pathwayPlans, ilsPlans, appointments, transitions, allowances, savings, onNavigate }) {
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  // STAT CARDS CALCULATION
  const stats = useMemo(() => {
    const activeResidents = residents.length;
    const turning21Soon = residents.filter(r => {
      const daysTo21 = daysUntil(new Date(new Date(r.dob).getFullYear() + 21, new Date(r.dob).getMonth(), new Date(r.dob).getDate()));
      return daysTo21 && daysTo21 <= 90 && daysTo21 > 0;
    }).length;

    const pathwayActive = residents.filter(r => {
      const plan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
      return plan && new Date(plan.review_date) > new Date();
    }).length;
    const pathwayPct = activeResidents > 0 ? Math.round((pathwayActive / activeResidents) * 100) : 0;

    const moveOnReady = residents.filter(r => {
      // Placeholder: check for move-on plan confirmed status
      return false; // Will be populated when MoveOnPlan entity exists
    }).length;

    const neet = residents.filter(r => {
      // Placeholder: check EETRecord
      return r.education_status === "neet";
    }).length;

    const avgStay = residents.length > 0
      ? Math.round(residents.reduce((sum, r) => {
          if (!r.placement_start) return sum;
          const days = Math.floor((Date.now() - new Date(r.placement_start).getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / residents.length)
      : 0;

    return { activeResidents, turning21Soon, pathwayPct, pathwayActive, moveOnReady, neet, avgStay };
  }, [residents, pathwayPlans]);

  // COMPLIANCE INDICATORS
  const compliance = useMemo(() => {
    const indicators = {
      noPlan: residents.filter(r => !pathwayPlans.find(p => p.resident_id === r.id && p.status === "active")).length,
      paOverdue: 0, // Placeholder
      laOverdue: residents.filter(r => {
        const plan = pathwayPlans.find(p => p.resident_id === r.id);
        return plan && new Date(plan.review_date) < new Date();
      }).length,
      noEET: residents.filter(r => !r.education_status || r.education_status === "unknown").length,
      turning21NoPlan: residents.filter(r => {
        const daysTo21 = daysUntil(new Date(new Date(r.dob).getFullYear() + 21, new Date(r.dob).getMonth(), new Date(r.dob).getDate()));
        if (!daysTo21 || daysTo21 > 0) return false;
        return !pathwayPlans.find(p => p.resident_id === r.id);
      }).length,
      benefitsReview: 0, // Placeholder
      ilsOutdated: residents.filter(r => {
        const plan = ilsPlans.find(p => p.resident_id === r.id);
        if (!plan) return true;
        const days = Math.floor((Date.now() - new Date(plan.updated_date || plan.created_date).getTime()) / (1000 * 60 * 60 * 24));
        return days > 30;
      }).length,
    };
    return indicators;
  }, [residents, pathwayPlans, ilsPlans]);

  const complianceList = [
    { label: "No current Pathway Plan", count: compliance.noPlan, color: "red" },
    { label: "PA visit overdue (>8 weeks)", count: compliance.paOverdue, color: "amber" },
    { label: "LA review overdue (>6 months)", count: compliance.laOverdue, color: "red" },
    { label: "No EET record this month", count: compliance.noEET, color: "amber" },
    { label: "Turning 21 — no move-on plan", count: compliance.turning21NoPlan, color: "red" },
    { label: "Benefits review needed", count: compliance.benefitsReview, color: "amber" },
    { label: "ILS not updated (>30 days)", count: compliance.ilsOutdated, color: "amber" },
  ];

  const allGreen = complianceList.every(c => c.count === 0);

  // MOVE-ON PIPELINE
  const pipeline = useMemo(() => {
    const stage1 = residents.filter(r => {
      const plan = pathwayPlans.find(p => p.resident_id === r.id);
      const daysInPlacement = r.placement_start ? Math.floor((Date.now() - new Date(r.placement_start).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return !plan || (daysInPlacement < 180);
    }).length;

    const stage2 = residents.filter(r => {
      const plan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
      const daysInPlacement = r.placement_start ? Math.floor((Date.now() - new Date(r.placement_start).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return plan && daysInPlacement >= 180 && daysInPlacement < 730;
    }).length;

    const stage3 = residents.filter(r => {
      const plan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
      const daysInPlacement = r.placement_start ? Math.floor((Date.now() - new Date(r.placement_start).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return plan && daysInPlacement >= 730;
    }).length;

    const stage4 = 0; // Placeholder for move-on confirmed
    const stage5 = transitions.filter(t => new Date(t.transition_date).getFullYear() === new Date().getFullYear()).length;

    return [
      { name: "Settling In", value: stage1 },
      { name: "Skills Building", value: stage2 },
      { name: "Preparing to Move", value: stage3 },
      { name: "Move Confirmed", value: stage4 },
      { name: "Moved Out (this year)", value: stage5 },
    ];
  }, [residents, pathwayPlans, transitions]);

  // EET BREAKDOWN
  const eetBreakdown = useMemo(() => {
    const data = {
      employed: residents.filter(r => r.education_status === "employed").length,
      education: residents.filter(r => r.education_status === "enrolled_college" || r.education_status === "enrolled_school").length,
      apprentice: residents.filter(r => r.education_status === "training").length,
      volunteer: 0, // Placeholder
      neet: residents.filter(r => r.education_status === "neet").length,
      unknown: residents.filter(r => !r.education_status || r.education_status === "unknown").length,
    };
    return [
      { name: "Employed", value: data.employed, fill: "#10b981" },
      { name: "Education/Training", value: data.education, fill: "#3b82f6" },
      { name: "Apprenticeship", value: data.apprentice, fill: "#14b8a6" },
      { name: "Volunteering", value: data.volunteer, fill: "#a855f7" },
      { name: "NEET", value: data.neet, fill: "#ef4444" },
      { name: "Unknown", value: data.unknown, fill: "#9ca3af" },
    ];
  }, [residents]);

  // THIS WEEK ACTIVITY
  const thisWeekActivity = useMemo(() => {
    const today = new Date();
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const activities = [];

    // Reviews due this week
    pathwayPlans.forEach(plan => {
      const reviewDate = new Date(plan.review_date);
      if (reviewDate >= today && reviewDate <= weekEnd) {
        const resident = residents.find(r => r.id === plan.resident_id);
        if (resident) {
          activities.push({
            type: "Pathway Review",
            resident: resident.display_name,
            date: reviewDate,
            status: "upcoming",
          });
        }
      }
    });

    // Appointments this week
    appointments.forEach(apt => {
      const aptDate = new Date(apt.start_datetime);
      if (aptDate >= today && aptDate <= weekEnd) {
        const resident = residents.find(r => r.id === apt.resident_id);
        if (resident) {
          activities.push({
            type: "Appointment",
            resident: resident.display_name,
            date: aptDate,
            status: "upcoming",
          });
        }
      }
    });

    // Overdue reviews
    pathwayPlans.forEach(plan => {
      const reviewDate = new Date(plan.review_date);
      if (reviewDate < today) {
        const resident = residents.find(r => r.id === plan.resident_id);
        if (resident) {
          activities.push({
            type: "Pathway Review (OVERDUE)",
            resident: resident.display_name,
            date: reviewDate,
            status: "overdue",
          });
        }
      }
    });

    return activities.sort((a, b) => a.date - b.date);
  }, [residents, pathwayPlans, appointments]);

  // ILS PROGRESS
  const ilsProgress = useMemo(() => {
    const domains = ["independence", "finance", "health", "relationships", "education", "housing", "risk_awareness", "self_care"];
    const scores = {};

    domains.forEach(domain => {
      const planScores = ilsPlans
        .filter(p => residents.find(r => r.id === p.resident_id))
        .map(p => {
          const skill = p.skills?.find(s => s.domain === domain);
          if (!skill) return 0;
          const scoreMap = { not_started: 0, developing: 33, achieved: 66, maintaining: 100 };
          return scoreMap[skill.progress] || 0;
        });
      scores[domain] = planScores.length > 0 ? Math.round(planScores.reduce((a, b) => a + b, 0) / planScores.length) : 0;
    });

    return Object.entries(scores)
      .map(([name, score]) => ({
        name: name.replace(/_/g, " "),
        score,
      }))
      .sort((a, b) => a.score - b.score);
  }, [residents, ilsPlans]);

  return (
    <div className="space-y-6">
      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        <StatCard
          title="Total Residents"
          value={stats.activeResidents}
          sub={`across ${homes.length} home${homes.length !== 1 ? "s" : ""}`}
          color="blue"
        />
        <StatCard
          title="Turning 21 Soon"
          value={stats.turning21Soon}
          sub="need move-on plan urgently"
          color={stats.turning21Soon > 0 ? "red" : "grey"}
        />
        <StatCard
          title="Pathway Plans Current"
          value={`${stats.pathwayPct}%`}
          sub={`${stats.pathwayActive} active`}
          color={stats.pathwayPct >= 90 ? "green" : stats.pathwayPct >= 70 ? "amber" : "red"}
        />
        <StatCard
          title="Move-On Ready"
          value={stats.moveOnReady}
          sub="accommodation confirmed"
          color="green"
        />
        <StatCard
          title="NEET"
          value={stats.neet}
          sub="not in education or employment"
          color={stats.neet > 0 ? "red" : "green"}
        />
        <StatCard
          title="Average Stay"
          value={`${stats.avgStay}d`}
          sub="days in 18+ placement"
          color="blue"
        />
      </div>

      {/* ROW 2 - THREE PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COMPLIANCE HEALTH */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Compliance Status</h3>
          {allGreen ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">All compliance checks passed</span>
            </div>
          ) : (
            <div className="space-y-2">
              {complianceList.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${item.color === "red" ? "bg-red-600" : "bg-amber-500"}`} />
                  <span>{item.label}</span>
                  <span className={`ml-auto font-semibold ${item.color === "red" ? "text-red-600" : "text-amber-600"}`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MOVE-ON PIPELINE */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Move-On Pipeline</h3>
          <ResponsiveContainer width="100%" height={250}>
            <FunnelChart layout="vertical">
              <Tooltip />
              <Funnel dataKey="value" data={pipeline} fill="#3b82f6">
                <LabelList dataKey="value" position="right" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* EET BREAKDOWN */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Education & Employment Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={eetBreakdown} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} dataKey="value">
                {eetBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          {stats.neet > 0 && (
            <div className="mt-3 text-xs text-red-600 font-medium">
              {stats.neet} NEET residents need an action plan
            </div>
          )}
        </div>
      </div>

      {/* ROW 3 - TWO PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* THIS WEEK */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4">This Week's Activity</h3>
          {thisWeekActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled activity this week</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {thisWeekActivity.map((activity, i) => (
                <div key={i} className={`flex items-center justify-between text-sm p-2 rounded ${activity.status === "overdue" ? "bg-red-500/10" : ""}`}>
                  <div>
                    <span className="font-medium">{activity.resident}</span>
                    <span className="text-muted-foreground ml-2">• {activity.type}</span>
                  </div>
                  <span className={`text-xs ${activity.status === "overdue" ? "text-red-600" : "text-muted-foreground"}`}>
                    {activity.date.toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ILS PROGRESS */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold mb-4 text-sm">Skills Progress (Org Avg)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart layout="vertical" data={ilsProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BENEFITS ALERTS */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-900">
          <AlertTriangle className="w-4 h-4" /> Unclaimed Entitlements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-amber-200 rounded p-3 bg-white">
            <p className="font-medium text-sm">Council Tax Exemption</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeResidents} residents under 25 — most councils exempt care leavers.</p>
            <button onClick={() => onNavigate?.("benefits")} className="text-xs text-primary mt-2 font-medium hover:underline">Review residents →</button>
          </div>
          <div className="border border-amber-200 rounded p-3 bg-white">
            <p className="font-medium text-sm">Setting Up Home Grant</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.turning21Soon} residents moving on may be eligible for a grant.</p>
            <button onClick={() => onNavigate?.("moveon")} className="text-xs text-primary mt-2 font-medium hover:underline">Review residents →</button>
          </div>
        </div>
      </div>
    </div>
  );
}