import { AlertCircle, Info } from "lucide-react";

// Exact values required by Annex A spec
const POLICE_CALLOUT_REASONS = [
  { value: "behaviour_management", label: "Behaviour management" },
  { value: "missing_person", label: "Missing person" },
  { value: "victim_of_crime", label: "Victim of crime" },
  { value: "other", label: "Other" },
];

const ARREST_OPTIONS = ["Yes", "No", "Not yet known"];
const CONVICTION_OPTIONS = ["Yes", "No", "Not yet known"];

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export function IncidentPoliceSection({ form, setForm }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isBehaviourMgmt = form.police_callout_reason === "behaviour_management";

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Police called?</FieldLabel>
        <select
          value={form.police_called ? "true" : "false"}
          onChange={e => update("police_called", e.target.value === "true")}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </div>

      {form.police_called && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Police call-out date</FieldLabel>
              <input
                type="date"
                value={form.police_callout_date || ""}
                onChange={e => update("police_callout_date", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              />
            </div>
            <div>
              <FieldLabel>Police call-out time</FieldLabel>
              <input
                type="time"
                value={form.police_callout_time || ""}
                onChange={e => update("police_callout_time", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              />
            </div>
          </div>

          {/* Annex A info box */}
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-xs text-blue-700">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <span>Only <strong>'behaviour management'</strong> call-outs are counted in Annex A Section 4.</span>
          </div>

          <div>
            <FieldLabel required>Reason for police call-out</FieldLabel>
            <select
              value={form.police_callout_reason || ""}
              onChange={e => update("police_callout_reason", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 ${!form.police_callout_reason ? "border-red-300" : "border-slate-200"}`}
            >
              <option value="">Select reason...</option>
              {POLICE_CALLOUT_REASONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* child_arrested + child_convicted only required for behaviour_management */}
          {isBehaviourMgmt && (
            <>
              <div>
                <FieldLabel required>Was child arrested?</FieldLabel>
                <select
                  value={form.child_arrested || ""}
                  onChange={e => update("child_arrested", e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 ${!form.child_arrested ? "border-red-300" : "border-slate-200"}`}
                >
                  <option value="">Select...</option>
                  {ARREST_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel required>Was child convicted?</FieldLabel>
                <select
                  value={form.child_convicted || ""}
                  onChange={e => update("child_convicted", e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 ${!form.child_convicted ? "border-red-300" : "border-slate-200"}`}
                >
                  <option value="">Select...</option>
                  {CONVICTION_OPTIONS.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {!isBehaviourMgmt && form.police_callout_reason && (
            <div>
              <FieldLabel>Was child arrested?</FieldLabel>
              <select
                value={form.child_arrested || ""}
                onChange={e => update("child_arrested", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              >
                <option value="">Select...</option>
                {ARREST_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <FieldLabel>Police reference number</FieldLabel>
            <input
              type="text"
              value={form.police_reference_number || ""}
              onChange={e => update("police_reference_number", e.target.value)}
              placeholder="e.g. POL-2026-XXXXX"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
            />
          </div>

          <div>
            <FieldLabel>Exclude from Annex A police behaviour call-out?</FieldLabel>
            <select
              value={form.exclude_from_annex_a ? "true" : "false"}
              onChange={e => update("exclude_from_annex_a", e.target.value === "true")}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          {form.exclude_from_annex_a && (
            <div>
              <FieldLabel>Exclusion reason</FieldLabel>
              <textarea
                value={form.exclusion_reason || ""}
                onChange={e => update("exclusion_reason", e.target.value)}
                placeholder="Explain why this incident is excluded from Annex A..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}