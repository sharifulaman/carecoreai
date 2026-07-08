import { Users, CheckCircle, Clock, Hourglass, Shield, BookOpen, Award } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color = "text-primary", iconBg = "bg-primary/10", iconColor = "text-primary", linkText, onClick }) {
  return (
    <div onClick={onClick} className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      {sub && <p className="text-xs text-muted-foreground mb-2">{sub}</p>}
      {linkText && (
        <button
          onClick={onClick}
          className="text-xs text-primary hover:underline font-medium"
        >
          {linkText} →
        </button>
      )}
    </div>
  );
}

export default function HRDashboardKPICards({ stats, onCardClick }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
      <StatCard
        icon={Users}
        label="Total Staff"
        value={stats.totalStaff}
        sub="Across all homes"
        iconBg="bg-blue-500/10"
        iconColor="text-blue-500"
        linkText="View all staff"
        onClick={() => onCardClick?.("total")}
      />
      <StatCard
        icon={CheckCircle}
        label="Training Completion"
        value={`${stats.completionPct}%`}
        sub={`${stats.completeCount} / ${stats.totalStaff} staff complete`}
        iconBg="bg-green-500/10"
        iconColor="text-green-500"
        color={stats.completionPct >= 80 ? "text-green-600" : stats.completionPct >= 60 ? "text-amber-600" : "text-red-600"}
        linkText="View details"
        onClick={() => onCardClick?.("compliant")}
      />
      <StatCard
        icon={Clock}
        label="Overdue Training"
        value={stats.overdueCount}
        sub={`${stats.overduePercent}% of staff`}
        iconBg={stats.overdueCount > 0 ? "bg-red-500/10" : "bg-muted"}
        iconColor={stats.overdueCount > 0 ? "text-red-500" : "text-muted-foreground"}
        color={stats.overdueCount > 0 ? "text-red-600" : "text-foreground"}
        linkText="View overdue"
        onClick={() => onCardClick?.("overdue")}
      />
      <StatCard
        icon={Hourglass}
        label="Expiring Soon"
        value={stats.expiringSoonCount}
        sub="Within 60 days"
        iconBg={stats.expiringSoonCount > 0 ? "bg-amber-500/10" : "bg-muted"}
        iconColor={stats.expiringSoonCount > 0 ? "text-amber-500" : "text-muted-foreground"}
        color={stats.expiringSoonCount > 0 ? "text-amber-600" : "text-foreground"}
        linkText="View expiring"
        onClick={() => onCardClick?.("expiring")}
      />
      <StatCard
        icon={Shield}
        label="Right to Work Compliance"
        value={`${stats.rtwCompliance}%`}
        sub={`${stats.rtwCompliantCount} / ${stats.totalStaff} compliant`}
        iconBg="bg-purple-500/10"
        iconColor="text-purple-500"
        color={stats.rtwCompliance >= 95 ? "text-purple-600" : stats.rtwCompliance >= 80 ? "text-amber-600" : "text-red-600"}
        linkText="View compliance"
        onClick={() => onCardClick?.("rtw")}
      />
      <StatCard
        icon={BookOpen}
        label="Policies Acknowledged"
        value={stats.policyAcknowledgements || 0}
        sub={`${stats.totalStaff > 0 ? Math.round((stats.policyAcknowledgements / stats.totalStaff) * 100) : 0}% of staff`}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
        color={stats.policyAcknowledgements > 0 ? "text-emerald-600" : "text-muted-foreground"}
        linkText="View details"
        onClick={() => onCardClick?.("policies")}
      />
      <StatCard
        icon={Award}
        label="Quiz Passes"
        value={stats.quizPasses || 0}
        sub={`Avg score: ${stats.avgQuizScore ? Math.round(stats.avgQuizScore) : 0}%`}
        iconBg={stats.quizPasses > 0 ? "bg-amber-500/10" : "bg-muted"}
        iconColor={stats.quizPasses > 0 ? "text-amber-500" : "text-muted-foreground"}
        color={stats.quizPasses > 0 ? "text-amber-600" : "text-foreground"}
        linkText="View results"
        onClick={() => onCardClick?.("quizzes")}
      />
    </div>
  );
}