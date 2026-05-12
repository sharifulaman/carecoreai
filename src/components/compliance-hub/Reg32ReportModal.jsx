import { X, Printer, Download, Shield } from "lucide-react";
import { format } from "date-fns";

export default function Reg32ReportModal({
  open, onClose,
  orgName, reviewerName, reviewerOrg, completedDate,
  periodStart, periodEnd,
  strengthsNarrative, improvementsNarrative, actionPlanNarrative,
  selectedYPs, residents, homes,
}) {
  if (!open) return null;

  const handlePrint = () => window.print();

  const ypNames = (selectedYPs || [])
    .map(id => {
      const r = (residents || []).find(r => r.id === id);
      return r?.display_name || r?.initials || null;
    })
    .filter(Boolean);

  const homeNames = (homes || []).map(h => h.name).join(", ");
  const today = format(new Date(), "dd MMMM yyyy");
  const fmtDate = (d) => { try { return d ? format(new Date(d), "dd MMMM yyyy") : "—"; } catch { return d || "—"; } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      {/* Modal container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Modal toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-slate-800">Regulation 32 — Quality of Support Review</span>
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium"
            >
              <Printer className="w-4 h-4" /> Print / Export PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable report body */}
        <div id="reg32-report-body" className="overflow-y-auto flex-1 px-10 py-8 bg-white text-slate-800 print:px-0 print:py-0">

          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-5 mb-7">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 mb-1">Regulation 32 — Children's Homes (England) Regulations 2015</p>
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">Quality of Care Review</h1>
                <h2 className="text-base font-medium text-slate-600 mt-0.5">Independent Person's Report</h2>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">{orgName || "Evolvix Digital Ltd"}</p>
                <p className="text-xs text-slate-500 mt-0.5">Registered Children's Home Provider</p>
              </div>
            </div>
          </div>

          {/* Cover details table */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8 text-sm">
            {[
              ["Review Period", `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`],
              ["Date Completed", fmtDate(completedDate)],
              ["Independent Reviewer", reviewerName || "—"],
              ["Reviewer Organisation", reviewerOrg || "—"],
              ["Homes Reviewed", homeNames || "—"],
              ["Report Reference", `REG32-${format(new Date(), "yyyy")}-${String(Math.floor(Math.random() * 900) + 100)}`],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
                <span className="font-medium text-slate-800 mt-0.5">{value}</span>
              </div>
            ))}
          </div>

          {/* YP section */}
          {ypNames.length > 0 && (
            <div className="mb-8 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Young People Involved in This Review</p>
              <div className="flex flex-wrap gap-2">
                {ypNames.map((n, i) => (
                  <span key={i} className="text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">{n}</span>
                ))}
              </div>
            </div>
          )}

          {/* Section 1 */}
          <Section
            number="1"
            title="Strengths and Quality of Support"
            regulation="Reg 32(2)(a)"
            content={strengthsNarrative}
            placeholder="No narrative generated yet. Use the AI generator to populate this section."
          />

          {/* Section 2 */}
          <Section
            number="2"
            title="Areas for Improvement"
            regulation="Reg 32(2)(b)"
            content={improvementsNarrative}
            placeholder="No narrative generated yet."
          />

          {/* Section 3 */}
          <Section
            number="3"
            title="Action Plan — Next 6 Months"
            regulation="Reg 32(2)(c)"
            content={actionPlanNarrative}
            placeholder="No action plan generated yet."
          />

          {/* Signature block */}
          <div className="mt-10 border-t border-slate-200 pt-8 grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Independent Reviewer</p>
              <div className="border-b border-slate-300 pb-1 mb-2 h-10" />
              <p className="text-sm font-medium">{reviewerName || "___________________________"}</p>
              <p className="text-xs text-slate-500">{reviewerOrg || "Organisation"}</p>
              <p className="text-xs text-slate-400 mt-2">Date: {fmtDate(completedDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Responsible Individual / Registered Manager</p>
              <div className="border-b border-slate-300 pb-1 mb-2 h-10" />
              <p className="text-sm font-medium">___________________________</p>
              <p className="text-xs text-slate-500">{orgName || "Evolvix Digital Ltd"}</p>
              <p className="text-xs text-slate-400 mt-2">Date: _______________</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
            This report has been produced in accordance with Regulation 32 of the Children's Homes (England) Regulations 2015. 
            It must be submitted to Ofsted within 28 days of the review being completed and is not for public distribution.
            <br />
            <span className="font-medium">{orgName || "Evolvix Digital Ltd"}</span> · Report generated {today}
          </div>
        </div>
      </div>

      {/* Print styles injected inline */}
      <style>{`
        @media print {
          body > *:not(#reg32-print-root) { display: none !important; }
          #reg32-report-body { max-height: none !important; overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}

function Section({ number, title, regulation, content, placeholder }) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{number}</div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">{title}</h3>
          <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider">{regulation}</span>
        </div>
      </div>
      <div className="ml-10 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
        {content || <span className="text-slate-400 italic">{placeholder}</span>}
      </div>
    </div>
  );
}