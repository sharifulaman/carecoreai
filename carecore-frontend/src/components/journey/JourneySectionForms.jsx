import { useState } from "react";
import { Plus, MoreVertical, AlertTriangle, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

// ── Helpers ────────────────────────────────────────────────────────────────────
const YNU = ({ label, field, value, onChange }) => (
  <div>
    <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
    <div className="flex gap-2">
      {["yes", "no", "unknown"].map(v => (
        <button key={v} onClick={() => onChange(field, v)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-colors ${value === v ? "bg-purple-500 text-white border-purple-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </button>
      ))}
    </div>
  </div>
);

const TextField = ({ label, field, value, onChange, multiline = false, placeholder = "" }) => (
  <div>
    <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
    {multiline
      ? <textarea value={value || ""} onChange={e => onChange(field, e.target.value)} placeholder={placeholder} rows={3}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none" />
      : <input value={value || ""} onChange={e => onChange(field, e.target.value)} placeholder={placeholder}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
    }
  </div>
);

// ── 1. Identity & Origin ──────────────────────────────────────────────────────
export function IdentitySection({ record, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-800">1. Identity & Origin</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Full name used by young person" field="full_name_used" value={record?.full_name_used} onChange={onChange} />
        <TextField label="Other names / aliases" field="other_names" value={record?.other_names} onChange={onChange} />
        <TextField label="Date of birth (as claimed)" field="dob_claimed" value={record?.dob_claimed} onChange={onChange} placeholder="e.g. 14 Feb 2009 / Approx 2008" />
        <TextField label="Nationality" field="nationality" value={record?.nationality} onChange={onChange} />
        <TextField label="Ethnicity / tribe / community" field="ethnicity" value={record?.ethnicity} onChange={onChange} />
        <TextField label="Religion (if relevant)" field="religion" value={record?.religion} onChange={onChange} />
        <TextField label="Home country" field="country_of_origin" value={record?.country_of_origin} onChange={onChange} />
        <TextField label="Home town / village / city" field="home_town" value={record?.home_town} onChange={onChange} />
        <TextField label="Last address in home country" field="last_address_in_home_country" value={record?.last_address_in_home_country} onChange={onChange} />
        <TextField label="Language spoken" field="language_spoken" value={record?.language_spoken} onChange={onChange} />
        <TextField label="Preferred interpreter language" field="preferred_interpreter_language" value={record?.preferred_interpreter_language} onChange={onChange} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <YNU label="Age disputed?" field="age_disputed" value={record?.age_disputed} onChange={onChange} />
        <YNU label="Interpreter needed?" field="interpreter_required" value={record?.interpreter_required} onChange={onChange} />
      </div>
      <TextField label="Notes" field="identity_notes" value={record?.identity_notes} onChange={onChange} multiline />
    </div>
  );
}

// ── 2. Family Background ──────────────────────────────────────────────────────
export function FamilySection({ familyMembers, residentId, lifeStoryId, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const RELATIONSHIPS = ["Mother", "Father", "Step-parent", "Brother", "Sister", "Uncle", "Aunt", "Grandparent", "Cousin", "Spouse", "Child", "Family friend", "Other"];

  const handleSave = async (form) => {
    const data = { ...form, org_id: ORG_ID, resident_id: residentId, life_story_id: lifeStoryId };
    if (form.id) await base44.entities.JourneyFamilyMember.update(form.id, data);
    else await base44.entities.JourneyFamilyMember.create(data);
    toast.success("Family member saved");
    onRefresh();
    setShowModal(false);
    setEditMember(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.JourneyFamilyMember.delete(id);
    toast.success("Removed");
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">2. Family Background</h3>
        <button onClick={() => { setEditMember(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700">
          <Plus className="w-3 h-3" /> Add Family Member
        </button>
      </div>

      {familyMembers.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No family members recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                {["Name", "Relationship", "Location", "Contact Status", "Safety", "Notes", ""].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {familyMembers.map(m => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{m.name || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600 capitalize">{m.relationship || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-500">{m.current_location || "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${m.contact_status === "in_contact" ? "bg-green-100 text-green-700" : m.contact_status === "not_in_contact" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                      {m.contact_status?.replace(/_/g, " ") || "Unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${m.safety_status === "safe" ? "bg-green-100 text-green-700" : m.safety_status === "unsafe" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
                      {m.safety_status || "Unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 max-w-[120px] truncate">{m.notes || "—"}</td>
                  <td className="px-3 py-2.5 relative">
                    <button onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)} className="text-slate-300 hover:text-slate-600 p-1">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenu === m.id && (
                      <div className="absolute right-2 top-8 bg-white border border-slate-200 rounded-xl shadow-lg z-10 min-w-[120px] py-1">
                        <button onClick={() => { setEditMember(m); setShowModal(true); setOpenMenu(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50">Edit</button>
                        <button onClick={() => { handleDelete(m.id); setOpenMenu(null); }} className="w-full text-left px-4 py-2 text-xs hover:bg-red-50 text-red-600">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <FamilyMemberModal
          member={editMember}
          relationships={RELATIONSHIPS}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditMember(null); }}
        />
      )}
    </div>
  );
}

function FamilyMemberModal({ member, relationships, onSave, onClose }) {
  const [form, setForm] = useState(member || { name: "", relationship: "", approximate_age: "", current_location: "", contact_status: "unknown", safety_status: "unknown", notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4">{member ? "Edit" : "Add"} Family Member</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <TextField label="Name" field="name" value={form.name} onChange={set} />
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Relationship</label>
            <select value={form.relationship} onChange={e => set("relationship", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
              <option value="">Select…</option>
              {relationships.map(r => <option key={r} value={r.toLowerCase()}>{r}</option>)}
            </select>
          </div>
          <TextField label="Approximate age" field="approximate_age" value={form.approximate_age} onChange={set} />
          <TextField label="Current location / country" field="current_location" value={form.current_location} onChange={set} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Contact Status</label>
            <select value={form.contact_status} onChange={e => set("contact_status", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
              <option value="in_contact">In contact</option>
              <option value="not_in_contact">Not in contact</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Safety status</label>
            <select value={form.safety_status} onChange={e => set("safety_status", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
              <option value="safe">Safe</option>
              <option value="unsafe">Unsafe</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <TextField label="Last contact date" field="last_contact_date" value={form.last_contact_date} onChange={set} placeholder="e.g. Mar 2025" />
        </div>
        <TextField label="Notes" field="notes" value={form.notes} onChange={set} multiline />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 text-sm font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── 3. Reason for Leaving ─────────────────────────────────────────────────────
const REASON_CATEGORIES = [
  "War / conflict", "Threat from armed group", "Political opinion", "Religion", "Ethnicity / tribe",
  "Forced recruitment", "Forced marriage", "Honour-based violence", "Trafficking / exploitation",
  "Domestic abuse", "Sexual violence", "Family dispute", "Poverty / survival",
  "Education denied", "Threat due to family member", "Other",
];

export function ReasonSection({ record, onChange }) {
  const selected = record?.reason_for_leaving_categories || [];
  const toggle = (cat) => {
    const next = selected.includes(cat) ? selected.filter(c => c !== cat) : [...selected, cat];
    onChange("reason_for_leaving_categories", next);
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-800">3. Reason for Leaving</h3>
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-2 block">Reason categories (select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {REASON_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => toggle(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected.includes(cat) ? "bg-purple-500 text-white border-purple-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="What happened before leaving?" field="what_happened_before_leaving" value={record?.what_happened_before_leaving} onChange={onChange} multiline />
        <TextField label="Who was the threat from?" field="who_was_threat_from" value={record?.who_was_threat_from} onChange={onChange} multiline />
        <TextField label="When did the problems start?" field="problems_start_date" value={record?.problems_start_date} onChange={onChange} />
        <TextField label="Who decided they should leave?" field="who_decided_to_leave" value={record?.who_decided_to_leave} onChange={onChange} />
        <TextField label="Why could authorities not protect them?" field="why_authorities_couldnt_protect" value={record?.why_authorities_couldnt_protect} onChange={onChange} multiline />
        <TextField label="What would happen if they stayed?" field="what_would_happen_if_stayed" value={record?.what_would_happen_if_stayed} onChange={onChange} multiline />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <YNU label="Was the young person directly harmed?" field="yp_directly_harmed" value={record?.yp_directly_harmed} onChange={onChange} />
        <YNU label="Was anyone in the family harmed?" field="family_member_harmed" value={record?.family_member_harmed} onChange={onChange} />
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Did they report to police/authorities?</label>
          <div className="flex gap-2 flex-wrap">
            {["yes", "no", "not_safe", "unknown"].map(v => (
              <button key={v} onClick={() => onChange("reported_to_police", v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-colors ${record?.reported_to_police === v ? "bg-purple-500 text-white border-purple-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {v === "not_safe" ? "Not safe to" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <TextField label="Reason for leaving summary" field="reason_for_leaving_summary" value={record?.reason_for_leaving_summary} onChange={onChange} multiline placeholder="As stated by the young person…" />
    </div>
  );
}

// ── 5. Countries Passed Through ───────────────────────────────────────────────
export function CountriesSection({ countries, residentId, lifeStoryId, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editCountry, setEditCountry] = useState(null);

  const handleSave = async (form) => {
    const data = { ...form, org_id: ORG_ID, resident_id: residentId, life_story_id: lifeStoryId };
    if (form.id) await base44.entities.JourneyCountryPassedThrough.update(form.id, data);
    else await base44.entities.JourneyCountryPassedThrough.create(data);
    toast.success("Country saved");
    onRefresh();
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.JourneyCountryPassedThrough.delete(id);
    toast.success("Removed");
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">5. Countries Passed Through</h3>
          <p className="text-xs text-slate-500 mt-0.5">Auto-populated from journey stages. You can add or edit manually.</p>
        </div>
        <button onClick={() => { setEditCountry(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700">
          <Plus className="w-3 h-3" /> Add Country
        </button>
      </div>
      {countries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No countries recorded. Add journey stages first or add manually.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                {["Country", "Dates", "Duration", "Asylum Applied", "Fingerprinted", "Detained", "Documents", "Stayed in camp", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {countries.map(c => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-semibold text-slate-700">{c.country}</td>
                  <td className="px-3 py-2.5 text-slate-500">{c.approximate_dates || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-500">{c.duration_stayed || "—"}</td>
                  {["applied_for_asylum", "fingerprinted", "detained", "given_documents", "stayed_in_camp_or_shelter"].map(field => (
                    <td key={field} className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${c[field] === "yes" ? "bg-green-100 text-green-700" : c[field] === "no" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-400"}`}>
                        {c[field] || "Unknown"}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditCountry(c); setShowModal(true); }} className="text-xs text-purple-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:underline ml-1">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <CountryModal country={editCountry} onSave={handleSave} onClose={() => { setShowModal(false); setEditCountry(null); }} />
      )}
    </div>
  );
}

function CountryModal({ country, onSave, onClose }) {
  const [form, setForm] = useState(country || { country: "", approximate_dates: "", duration_stayed: "", applied_for_asylum: "unknown", fingerprinted: "unknown", detained: "unknown", given_documents: "unknown", stayed_in_camp_or_shelter: "unknown", notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4">{country ? "Edit" : "Add"} Country</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <TextField label="Country" field="country" value={form.country} onChange={set} />
          <TextField label="Approximate dates" field="approximate_dates" value={form.approximate_dates} onChange={set} placeholder="e.g. Jan–Mar 2025" />
          <TextField label="Duration stayed" field="duration_stayed" value={form.duration_stayed} onChange={set} placeholder="e.g. 2 months" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {[
            ["Applied for asylum there?", "applied_for_asylum"],
            ["Fingerprinted?", "fingerprinted"],
            ["Detained?", "detained"],
            ["Given documents?", "given_documents"],
            ["Stayed in camp/shelter?", "stayed_in_camp_or_shelter"],
          ].map(([label, field]) => <YNU key={field} label={label} field={field} value={form[field]} onChange={set} />)}
        </div>
        <TextField label="Notes" field="notes" value={form.notes} onChange={set} multiline />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 text-sm font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── 6. Travel Methods & Documents ─────────────────────────────────────────────
export function TravelDocumentsSection({ record, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-800">6. Travel Methods & Documents</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <YNU label="Did the YP have a passport?" field="had_passport" value={record?.had_passport} onChange={onChange} />
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Whose passport was used?</label>
          <select value={record?.passport_used_type || ""} onChange={e => onChange("passport_used_type", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
            <option value="">Select…</option>
            {["Own passport", "False passport", "Someone else's passport", "Unknown"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <YNU label="Was any ID used?" field="id_used" value={record?.id_used} onChange={onChange} />
        <YNU label="Was the document taken away?" field="document_taken_away" value={record?.document_taken_away} onChange={onChange} />
        <TextField label="Who took it?" field="document_taken_by" value={record?.document_taken_by} onChange={onChange} />
        <YNU label="Documents currently held?" field="documents_currently_held" value={record?.documents_currently_held} onChange={onChange} />
        <YNU label="Travelled by air?" field="travelled_by_air" value={record?.travelled_by_air} onChange={onChange} />
        <YNU label="Travelled by rail?" field="travelled_by_rail" value={record?.travelled_by_rail} onChange={onChange} />
        <YNU label="Travelled by boat?" field="travelled_by_boat" value={record?.travelled_by_boat} onChange={onChange} />
        <YNU label="Travelled by car/lorry?" field="travelled_by_car_or_lorry" value={record?.travelled_by_car_or_lorry} onChange={onChange} />
      </div>
    </div>
  );
}

// ── 7. People Who Helped ──────────────────────────────────────────────────────
const EXPLOITATION_INDICATORS = [
  "Debt bondage", "Threats", "Physical violence", "Forced work", "Sexual exploitation",
  "Passport taken", "Locked in property", "Controlled movement", "No access to phone",
  "Unknown adults controlling travel",
];

export function HelpersSection({ record, onChange }) {
  const selected = record?.exploitation_indicators || [];
  const toggle = (ind) => {
    const next = selected.includes(ind) ? selected.filter(x => x !== ind) : [...selected, ind];
    onChange("exploitation_indicators", next);
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-800">7. People Who Helped</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Who arranged the journey?</label>
          <select value={record?.journey_arranged_by || ""} onChange={e => onChange("journey_arranged_by", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
            <option value="">Select…</option>
            {["Parent", "Relative", "Family friend", "Smuggler/agent", "Community member", "Unknown person", "Young person arranged themselves", "Other"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <YNU label="Was a smuggler/agent involved?" field="smuggler_involved" value={record?.smuggler_involved} onChange={onChange} />
        <YNU label="Was the YP forced or controlled?" field="forced_or_controlled" value={record?.forced_or_controlled} onChange={onChange} />
        <TextField label="Any threats from helpers/agents?" field="threats_from_helpers" value={record?.threats_from_helpers} onChange={onChange} multiline />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-2 block">Exploitation indicators (select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {EXPLOITATION_INDICATORS.map(ind => (
            <button key={ind} onClick={() => toggle(ind)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected.includes(ind) ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {ind}
            </button>
          ))}
        </div>
      </div>
      <TextField label="Notes" field="helpers_notes" value={record?.helpers_notes} onChange={onChange} multiline />
    </div>
  );
}

// ── 8. Journey Cost & Funding ──────────────────────────────────────────────────
export function FundingSection({ record, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-800">8. Journey Cost & Funding</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <YNU label="Was money paid for the journey?" field="money_paid_for_journey" value={record?.money_paid_for_journey} onChange={onChange} />
        <TextField label="Approximate total amount" field="approximate_total_amount" value={record?.approximate_total_amount} onChange={onChange} placeholder="e.g. 10,000" />
        <TextField label="Currency" field="currency" value={record?.currency} onChange={onChange} placeholder="e.g. USD, GBP, EUR" />
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Who paid?</label>
          <select value={record?.paid_by || ""} onChange={e => onChange("paid_by", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
            <option value="">Select…</option>
            {["Parent", "Uncle/Aunt", "Sibling", "Wider family", "Family friend", "Community collection", "Young person", "Unknown", "Other"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <YNU label="Was money borrowed?" field="money_borrowed" value={record?.money_borrowed} onChange={onChange} />
        <YNU label="Is there debt outstanding?" field="debt_outstanding" value={record?.debt_outstanding} onChange={onChange} />
        <TextField label="Who is demanding repayment?" field="repayment_demanded_by" value={record?.repayment_demanded_by} onChange={onChange} />
        <YNU label="Is the YP or family under threat due to debt?" field="threat_due_to_debt" value={record?.threat_due_to_debt} onChange={onChange} />
      </div>
      {record?.debt_outstanding === "yes" && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 font-medium">Outstanding travel debt may indicate trafficking or exploitation risk.</p>
        </div>
      )}
      <TextField label="Notes" field="funding_notes" value={record?.funding_notes} onChange={onChange} multiline />
    </div>
  );
}

// ── 9. Previous Asylum Claims ──────────────────────────────────────────────────
export function AsylumClaimsSection({ claims, residentId, lifeStoryId, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editClaim, setEditClaim] = useState(null);

  const handleSave = async (form) => {
    const data = { ...form, org_id: ORG_ID, resident_id: residentId, life_story_id: lifeStoryId };
    if (form.id) await base44.entities.PreviousAsylumClaim.update(form.id, data);
    else await base44.entities.PreviousAsylumClaim.create(data);
    toast.success("Asylum claim saved");
    onRefresh();
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.PreviousAsylumClaim.delete(id);
    toast.success("Removed");
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">9. Previous Asylum Claims</h3>
        <button onClick={() => { setEditClaim(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700">
          <Plus className="w-3 h-3" /> Add Previous Claim
        </button>
      </div>
      {claims.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No previous asylum claims recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                {["Country", "Date", "Fingerprinted", "Interviewed", "Outcome", "Notes", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.map(c => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-semibold text-slate-700">{c.country}</td>
                  <td className="px-3 py-2.5 text-slate-500">{c.application_date || "—"}{c.application_date_approximate && <span className="text-slate-400 ml-1">Approx.</span>}</td>
                  <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${c.fingerprinted === "yes" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{c.fingerprinted || "Unknown"}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] capitalize ${c.interviewed === "yes" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{c.interviewed || "Unknown"}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${c.outcome === "granted" ? "bg-green-100 text-green-700" : c.outcome === "refused" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>{c.outcome || "Unknown"}</span></td>
                  <td className="px-3 py-2.5 text-slate-400 max-w-[120px] truncate">{c.notes || "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditClaim(c); setShowModal(true); }} className="text-xs text-purple-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:underline ml-1">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <AsylumClaimModal claim={editClaim} onSave={handleSave} onClose={() => { setShowModal(false); setEditClaim(null); }} />
      )}
    </div>
  );
}

function AsylumClaimModal({ claim, onSave, onClose }) {
  const [form, setForm] = useState(claim || { country: "", application_date: "", application_date_approximate: false, fingerprinted: "unknown", interviewed: "unknown", decision_received: "unknown", outcome: "unknown", documents_issued: "", reason_left_country: "", notes: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4">{claim ? "Edit" : "Add"} Previous Asylum Claim</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <TextField label="Country" field="country" value={form.country} onChange={set} />
          <TextField label="Application date" field="application_date" value={form.application_date} onChange={set} placeholder="e.g. Jun 2024 / Approx 2024" />
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Outcome</label>
            <select value={form.outcome} onChange={e => set("outcome", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
              {["pending", "refused", "granted", "withdrawn", "unknown"].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
          </div>
          <TextField label="Documents issued" field="documents_issued" value={form.documents_issued} onChange={set} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <YNU label="Fingerprinted?" field="fingerprinted" value={form.fingerprinted} onChange={set} />
          <YNU label="Interviewed?" field="interviewed" value={form.interviewed} onChange={set} />
          <YNU label="Decision received?" field="decision_received" value={form.decision_received} onChange={set} />
        </div>
        <TextField label="Reason they left that country" field="reason_left_country" value={form.reason_left_country} onChange={set} multiline />
        <TextField label="Notes" field="notes" value={form.notes} onChange={set} multiline />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 text-sm font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── 10. Arrival in UK ─────────────────────────────────────────────────────────
export function ArrivalSection({ record, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-800">10. Arrival in the UK</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Date arrived in UK" field="uk_arrival_date" value={record?.uk_arrival_date} onChange={onChange} placeholder="e.g. 14 Mar 2026" />
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Method of arrival</label>
          <select value={record?.uk_arrival_method || ""} onChange={e => onChange("uk_arrival_method", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
            <option value="">Select…</option>
            {["Small boat", "Ferry", "Lorry", "Car", "Train", "Plane", "Walked from port", "Unknown", "Other"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <TextField label="Place arrived" field="uk_arrival_place" value={record?.uk_arrival_place} onChange={onChange} placeholder="e.g. Dover, Kent" />
        <YNU label="Arrived alone?" field="arrived_alone" value={record?.arrived_alone} onChange={onChange} />
        <TextField label="Who was with them?" field="who_was_with_them" value={record?.who_was_with_them} onChange={onChange} />
        <YNU label="Claimed asylum immediately?" field="claimed_asylum_immediately" value={record?.claimed_asylum_immediately} onChange={onChange} />
        <TextField label="Date of UK asylum claim" field="uk_asylum_claim_date" value={record?.uk_asylum_claim_date} onChange={onChange} />
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">First authority contacted</label>
          <select value={record?.first_authority_contacted || ""} onChange={e => onChange("first_authority_contacted", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
            <option value="">Select…</option>
            {["Border Force", "Police", "Social Services", "Local Authority", "Home Office", "Other"].map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <YNU label="Was the YP detained?" field="was_detained" value={record?.was_detained} onChange={onChange} />
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Was the YP age assessed?</label>
          <div className="flex gap-2 flex-wrap">
            {["yes", "no", "pending", "unknown"].map(v => (
              <button key={v} onClick={() => onChange("age_assessed", v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border capitalize transition-colors ${record?.age_assessed === v ? "bg-purple-500 text-white border-purple-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <TextField label="Local authority responsible" field="local_authority" value={record?.local_authority} onChange={onChange} />
        <TextField label="Home Office reference" field="home_office_reference" value={record?.home_office_reference} onChange={onChange} />
        <TextField label="Solicitor name" field="solicitor_name" value={record?.solicitor_name} onChange={onChange} />
        <TextField label="Solicitor firm" field="solicitor_firm" value={record?.solicitor_firm} onChange={onChange} />
        <TextField label="Solicitor email/phone" field="solicitor_contact" value={record?.solicitor_contact} onChange={onChange} />
      </div>
      <TextField label="Notes" field="arrival_notes" value={record?.arrival_notes} onChange={onChange} multiline />
    </div>
  );
}

// ── 11. Fear of Return ─────────────────────────────────────────────────────────
const FEAR_CATEGORIES = [
  "Death", "Torture", "Imprisonment", "Forced recruitment", "Family violence", "Honour-based harm",
  "Trafficking", "Debt-related threats", "Persecution", "Homelessness", "No family support",
  "Medical vulnerability", "Other",
];

export function FearSection({ record, onChange }) {
  const selected = record?.fear_risk_categories || [];
  const toggle = (cat) => {
    const next = selected.includes(cat) ? selected.filter(c => c !== cat) : [...selected, cat];
    onChange("fear_risk_categories", next);
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-800">11. Fear of Return</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="What does the YP fear if returned?" field="what_yp_fears_if_returned" value={record?.what_yp_fears_if_returned} onChange={onChange} multiline />
        <TextField label="Who would harm them?" field="who_would_harm_them" value={record?.who_would_harm_them} onChange={onChange} multiline />
        <TextField label="Why would they be targeted?" field="why_targeted" value={record?.why_targeted} onChange={onChange} multiline />
        <TextField label="Any evidence of threat?" field="fear_notes" value={record?.fear_notes} onChange={onChange} multiline />
        <TextField label="YP emotional response when discussing return" field="yp_emotional_response" value={record?.yp_emotional_response} onChange={onChange} placeholder="As observed by staff…" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <YNU label="Would family be able to protect them?" field="family_able_to_protect" value={record?.family_able_to_protect} onChange={onChange} />
        <YNU label="Would police/government protect them?" field="police_able_to_protect" value={record?.police_able_to_protect} onChange={onChange} />
        <YNU label="Could they safely live elsewhere in the country?" field="safe_internal_relocation" value={record?.safe_internal_relocation} onChange={onChange} />
        <YNU label="Any recent contact confirming risk?" field="recent_contact_confirming_risk" value={record?.recent_contact_confirming_risk} onChange={onChange} />
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-500 mb-2 block">Risk categories if returned</label>
        <div className="flex flex-wrap gap-2">
          {FEAR_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => toggle(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected.includes(cat) ? "bg-red-500 text-white border-red-500" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <TextField label="Fear of return summary" field="fear_of_return_summary" value={record?.fear_of_return_summary} onChange={onChange} multiline placeholder="Summary as stated by the young person…" />
    </div>
  );
}

// ── 12. Evidence & Documents ───────────────────────────────────────────────────
const DOC_TYPES = [
  "Home Office letter", "Asylum registration card", "Solicitor letter", "Age assessment",
  "Passport", "ID card", "Birth certificate", "School documents", "Medical evidence",
  "Police report", "Family message", "Country evidence", "Trafficking referral", "NRM document", "Other",
];

export function EvidenceSection({ evidenceDocs, residentId, lifeStoryId, staffProfile, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState(null);

  const handleSave = async (form) => {
    const data = {
      ...form, org_id: ORG_ID, resident_id: residentId, life_story_id: lifeStoryId,
      uploaded: true, uploaded_by: staffProfile?.full_name, uploaded_at: new Date().toISOString()
    };
    if (form.id) await base44.entities.JourneyEvidenceDocument.update(form.id, data);
    else await base44.entities.JourneyEvidenceDocument.create(data);
    toast.success("Document saved");
    onRefresh();
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.JourneyEvidenceDocument.delete(id);
    toast.success("Removed");
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-800">12. Evidence & Documents</h3>
        <button onClick={() => { setEditDoc(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700">
          <Plus className="w-3 h-3" /> Add Document
        </button>
      </div>
      {evidenceDocs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No evidence documents recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                {["Document Type", "Uploaded", "Reviewed", "Linked Section", "Notes", "Uploaded By", "Date", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidenceDocs.map(d => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 font-semibold text-slate-700">{d.document_type}</td>
                  <td className="px-3 py-2.5">{d.uploaded ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : "—"}</td>
                  <td className="px-3 py-2.5">{d.reviewed ? <CheckCircle2 className="w-4 h-4 text-blue-500" /> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2.5 text-slate-500">{d.linked_section || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400 max-w-[120px] truncate">{d.notes || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-500">{d.uploaded_by || "—"}</td>
                  <td className="px-3 py-2.5 text-slate-400">{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString("en-GB") : "—"}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditDoc(d); setShowModal(true); }} className="text-xs text-purple-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(d.id)} className="text-xs text-red-400 hover:underline ml-1">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <EvidenceDocModal doc={editDoc} docTypes={DOC_TYPES} onSave={handleSave} onClose={() => { setShowModal(false); setEditDoc(null); }} />
      )}
    </div>
  );
}

function EvidenceDocModal({ doc, docTypes, onSave, onClose }) {
  const [form, setForm] = useState(doc || { document_type: "", document_name: "", linked_section: "", notes: "", reviewed: false });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4">{doc ? "Edit" : "Add"} Document</h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Document Type</label>
            <select value={form.document_type} onChange={e => set("document_type", e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400">
              <option value="">Select…</option>
              {docTypes.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <TextField label="Document name / description" field="document_name" value={form.document_name} onChange={set} />
          <TextField label="Linked section" field="linked_section" value={form.linked_section} onChange={set} placeholder="e.g. Arrival in UK" />
          <TextField label="Notes" field="notes" value={form.notes} onChange={set} multiline />
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.reviewed} onChange={e => set("reviewed", e.target.checked)} className="rounded" />
            Marked as reviewed
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 text-sm font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ── 13. Statement Builder ──────────────────────────────────────────────────────
export function StatementBuilderSection({ record, stages, familyMembers, countries, claims, onSaveStatement, onRegenerateStatement, generating }) {
  const [draft, setDraft] = useState(record?.generated_statement || "");

  const displayDraft = record?.generated_statement || draft;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-base font-bold text-slate-800">13. Statement Builder</h3>
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
        ⚠️ <strong>Disclaimer:</strong> This is a care-record draft to assist professional review. It is not a formal legal witness statement until reviewed and approved by the young person's solicitor.
      </div>
      <p className="text-xs text-slate-500">
        Generate a structured draft chronology from the information already entered. This draft can be edited and reviewed before being shared with the young person's solicitor.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={onRegenerateStatement} disabled={generating}
          className="px-4 py-2 text-xs font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5">
          {generating ? "Generating…" : "✨ Generate Draft Statement"}
        </button>
        {displayDraft && (
          <>
            <button onClick={() => onSaveStatement(draft || displayDraft)} className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200">
              💾 Save Draft Statement
            </button>
          </>
        )}
      </div>

      {displayDraft ? (
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Draft journey chronology for professional review</label>
          <textarea
            value={draft || displayDraft}
            onChange={e => setDraft(e.target.value)}
            rows={20}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none bg-slate-50"
          />
          <p className="text-[10px] text-slate-400 mt-1">This draft was generated from recorded information. Edit as needed before sharing with the solicitor.</p>
        </div>
      ) : (
        <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-sm text-slate-400">Click "Generate Draft Statement" to create a structured chronology from the information entered.</p>
        </div>
      )}
    </div>
  );
}