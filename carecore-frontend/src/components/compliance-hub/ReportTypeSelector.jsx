import { ClipboardList, Bell, FileText, Users, MessageSquare, BookOpen, AlertTriangle, FileCheck, TrendingUp, ShieldAlert, MapPin, ArrowLeftRight, LifeBuoy, UserX, ClipboardCheck, Shield, ShieldCheck, Home, FolderOpen, Archive, BadgeCheck, AlertOctagon, PoundSterling } from "lucide-react";

const REPORT_TYPES = [
  // Ordered by regulation number
  { id: "childrens_guide", label: "Reg 7 — Support Standard (Children's Guide)", icon: BookOpen, badgeType: "version", version: "v1.3" },
  { id: "sop", label: "Reg 9 — Statement of Purpose", icon: FileText, badgeType: "version", version: "v2.1" },
  { id: "workforce", label: "Reg 10 — Workforce Plan", icon: Users, badgeType: "outdated" },
  { id: "reg4", label: "Reg 4 — Leadership and Management Standard", icon: Users },
  { id: "reg5", label: "Reg 5 — Protection Standard", icon: ShieldCheck },
  { id: "reg11_12", label: "Reg 11 & 12 — Fitness of Registered Persons", icon: BadgeCheck },
  { id: "reg17_18", label: "Reg 17 & 18 — Fitness and Employment of Staff", icon: ClipboardCheck },
  { id: "safeguarding_policy", label: "Reg 20 — Safeguarding Policy", icon: Shield },
  { id: "missing_child_policy", label: "Reg 21 — Missing Child Policy", icon: AlertTriangle },
  { id: "restraint_records", label: "Reg 22 — Behaviour Management Policy and Records", icon: ShieldAlert },
  { id: "contingency_plan_policy", label: "Reg 23 — Contingency Plan Policy", icon: LifeBuoy },
  { id: "case_records_retention", label: "Reg 24 & 25 — Case Records and Retention", icon: FolderOpen },
  { id: "storage_records", label: "Reg 26 — Storage of Records", icon: Archive },
  { id: "location_assessments", label: "Reg 6 — The Accommodation Standard", icon: MapPin },
  { id: "reg27", label: "Reg 27 — Notification of a Serious Event", icon: AlertTriangle, badgeType: "alert" },
  { id: "reg28", label: "Reg 28 — Admission & Discharge", icon: ArrowLeftRight },
  { id: "complaints", label: "Reg 31 — Complaints and Representations", icon: MessageSquare, badgeType: "count", countKey: "complaints" },
  { id: "reg32", label: "Reg 32 — Quality of Support Review", icon: ClipboardList, badgeType: "due" },
  { id: "reg33", label: "Reg 33 — Absence of Registered Service Manager", icon: Bell, badgeType: "count", countKey: "reg33" },
  { id: "reg34", label: "Reg 34 — Notice of Changes", icon: Bell, badgeType: "alert" },
  { id: "reg29", label: "Reg 29 — Notification of Offences", icon: AlertOctagon },
  { id: "reg35", label: "Reg 35 — Financial Position", icon: PoundSterling },
  { id: "annex_a", label: "Annex A — Inspection Report", icon: FileCheck, badgeType: "alert" },
  { id: "outcome_evidence", label: "Outcome & Impact Evidence", icon: TrendingUp, badgeType: "new" },
  ];

function Badge({ type, count, version }) {
  if (type === "due") return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white">Due</span>;
  if (type === "count" && count) return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">{count} open</span>;
  if (type === "version") return <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">{version}</span>;
  if (type === "outdated") return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white">Outdated</span>;
  if (type === "alert") return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">!</span>;
  if (type === "new") return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-500 text-white">New</span>;
  return null;
}

export default function ReportTypeSelector({ active, onChange, counts = {} }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Select Report Type</p>
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const isActive = active === rt.id;
          const count = counts[rt.countKey] || 0;
          return (
            <button
              key={rt.id}
              onClick={() => onChange(rt.id)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {rt.label}
              <Badge type={rt.badgeType} count={count} version={rt.version} />
            </button>
          );
        })}
      </div>
    </div>
  );
}