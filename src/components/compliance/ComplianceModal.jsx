import { X } from "lucide-react";

const SECTIONS = [
  {
    title: "PRIMARY LEGISLATION",
    items: [
      {
        name: "Children's Homes (England) Regulations 2015",
        desc: "All 9 Quality Standards covering care planning, safeguarding, behaviour management, health, education, staffing, and governance",
      },
      {
        name: "Children Act 1989 & 2004",
        desc: "Placement planning, care plans, resident records, safeguarding duties, and multi-agency working",
      },
      {
        name: "Care Planning, Placement and Case Review (England) Regulations 2010",
        desc: "Support plan structure, review cycles, and placement aims from the Local Authority, parents, and the young person",
      },
    ],
  },
  {
    title: "OFSTED INSPECTION FRAMEWORK",
    items: [
      {
        name: "Social Care Common Inspection Framework (SCCIF) 2025",
        desc: "Ofsted Readiness Score mapped to all 4 inspection judgements — experiences and progress, help and protection, leaders and managers, and overall effectiveness",
      },
      {
        name: "Regulation 32 — Independent monitoring visits",
        desc: "Monthly Reg32 report auto-populated from live platform data including incidents, safeguarding, staffing, training, finances, and placement stability",
      },
      {
        name: "Working Together to Safeguard Children 2023",
        desc: "Safeguarding records, multi-agency referrals, and serious event escalation",
      },
    ],
  },
  {
    title: "DATA PROTECTION",
    items: [
      {
        name: "UK GDPR & Data Protection Act 2018",
        desc: "Organisation-level data isolation, role-based access control, full audit trail on all records, and special category data handling for health and safeguarding records",
      },
    ],
  },
];

export default function ComplianceModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-lg font-bold">Regulatory compliance</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">
                CareCore AI is designed to support compliance with the following regulations, standards,
                and statutory guidance applicable to children's homes and care providers in England.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-500/10 text-green-700 border border-green-200">Ofsted regulated</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-500/10 text-blue-700 border border-blue-200">CQC compatible</span>
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-700 border border-amber-200">UK GDPR compliant</span>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {SECTIONS.map((section, si) => (
            <div key={si}>
              {si > 0 && <div className="border-t border-border mb-5" />}
              <p className="text-[11px] font-semibold text-muted-foreground tracking-wider mb-3">{section.title}</p>
              <div className="space-y-3">
                {section.items.map((item, ii) => (
                  <div key={ii} className="flex gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold leading-snug">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">Last reviewed May 2026 · Evolvix Digital Ltd</p>
          <button className="text-xs text-primary hover:underline">View full reference document ›</button>
        </div>
      </div>
    </div>
  );
}