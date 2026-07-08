import { AlertCircle } from "lucide-react";

const RESTRAINT_TYPES = ["Physical restraint", "Chemical restraint", "Mechanical restraint", "Seclusion", "Other"];

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export function IncidentRestraintSection({ form, setForm }) {
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Was restraint used?</FieldLabel>
        <select
          value={form.was_restraint_used ? "true" : "false"}
          onChange={e => update("was_restraint_used", e.target.value === "true")}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50"
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </div>

      {form.was_restraint_used && (
        <>
          <div>
            <FieldLabel required>Restraint type</FieldLabel>
            <select
              value={form.restraint_type || ""}
              onChange={e => update("restraint_type", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 ${!form.restraint_type ? "border-red-300" : "border-slate-200"}`}
            >
              <option value="">Select restraint type...</option>
              {RESTRAINT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel required>Reason restraint was used</FieldLabel>
            <textarea
              value={form.reason_restraint_used || ""}
              onChange={e => update("reason_restraint_used", e.target.value)}
              placeholder="Describe why restraint was necessary..."
              rows={3}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none ${!form.reason_restraint_used?.trim() ? "border-red-300" : "border-slate-200"}`}
            />
          </div>

          <div>
            <FieldLabel required>Was there an injury?</FieldLabel>
            <select
              value={form.restraint_injury === "" || form.restraint_injury === undefined ? "" : form.restraint_injury ? "true" : "false"}
              onChange={e => update("restraint_injury", e.target.value === "true")}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 ${(form.restraint_injury === "" || form.restraint_injury === undefined) ? "border-red-300" : "border-slate-200"}`}
            >
              <option value="">Select...</option>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Restraint incidents must be reviewed and documented. Ensure appropriate manager sign-off is recorded.</span>
          </div>
        </>
      )}
    </div>
  );
}