import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import Portal from "@/components/ui/Portal";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { toast } from "sonner";
import {addMaintenance} from "@/tests/maintenance";
const CATEGORIES = [
  "Plumbing", "Electrical", "Heating / Boiler", "Gas", "Fire Safety",
  "Security", "Furniture / Fixtures", "Appliance", "Cleaning / Hygiene",
  "Garden / External", "Structural / Building", "Pest Control", "Internet / Utilities", "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const STATUSES = [
  "Reported", "Assigned", "In Progress", "Awaiting Contractor",
  "Awaiting Parts", "Completed", "Cancelled",
];

const EMPTY = {
  home_id: "", title: "", category: "", priority: "", description: "",
  date_reported: new Date().toISOString().split("T")[0],
  reported_by_name: "", photo_url: "",
};

export default function AddMaintenanceModal({ homes, onClose, onSuccess, staffProfile, user }) {
  const { data: roleDefinitions = [] } = useQuery({ queryKey: ["role-definitions"], queryFn: () => base44.roles.fetchDefinitions() });
  const roleRank = roleDefinitions.find(r => r.role_name === staffProfile?.role)?.rank ?? (staffProfile?.role === "admin" ? 100 : (staffProfile?.role === "team_leader" ? 20 : 10));
  const isHighRank = roleRank > 10;

  const activeHomes = homes.filter(p => p.status !== "archived");
  const initialHomeId = activeHomes.length === 1 ? activeHomes[0].id : "";

  const [form, setForm] = useState({ 
    ...EMPTY, 
    home_id: initialHomeId, 
    reported_by_name: staffProfile?.full_name || user?.full_name || "" 
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: staffList = [] } = useQuery({ 
    queryKey: ["staff"], 
    queryFn: () => secureGateway.filter("StaffProfile"), 
    staleTime: 5 * 60 * 1000 
  });

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const errs = {};
    if (!form.home_id) errs.home_id = "Please select a property";
    if (!form.title?.trim()) errs.title = "Issue title is required";
    else if (form.title.trim().length < 5) errs.title = "Title must be at least 5 characters";
    if (!form.category) errs.category = "Please select a category";
    if (!form.priority) errs.priority = "Please select a priority";
    if (!form.description?.trim()) errs.description = "Description is required";
    else if (form.description.trim().length < 10) errs.description = "Please provide more detail (min 10 characters)";
    if (!form.date_reported) errs.date_reported = "Reported date is required";
    if (!form.reported_by_name?.trim()) errs.reported_by_name = "Reported by is required";
    return errs;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      set("photo_url", res.file_url);
    } finally {
      setUploading(false);
    }
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   const errs = validate();
  //   if (Object.keys(errs).length > 0) { setErrors(errs); toast.error("Please fill in all required fields"); return; }
  //   setSaving(true);
  //   try {
  //     const home = homes.find(p => p.id === form.home_id);
  //     await base44.entities.MaintenanceLog.create({
  //       org_id: home?.org_id || "",
  //       home_id: form.home_id,
  //       home_name: home?.name || "",
  //       title: form.title,
  //       category: form.category.toLowerCase().replace(/ \/ /g, "_").replace(/ /g, "_"),
  //       priority: form.priority.toLowerCase(),
  //       description: form.description,
  //       date_reported: form.date_reported,
  //       status: "open",
  //       reported_by_name: form.reported_by_name || staffProfile?.full_name || user?.full_name || "",
  //       photo_url: form.photo_url,
  //     });
  //     onSuccess();
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if(Object.keys(errs).length > 0){
      setErrors(errs);
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const home = homes.find(p => p.id === form.home_id);
      const result = await addMaintenance({
        form:form,
        home:home,
        staffProfile:staffProfile,
        user:user
      });
     
      onSuccess();
    } finally {
      setSaving(false);
    }
  }



  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900">Add Maintenance Issue</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Property */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Property / Home <span className="text-red-500">*</span></label>
              <select value={form.home_id} onChange={e => set("home_id", e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.home_id ? "border-red-400" : "border-slate-200"}`}>
                <option value="">Select property...</option>
                {activeHomes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {errors.home_id && <p className="text-xs text-red-500 mt-1">{errors.home_id}</p>}
            </div>

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Title <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="e.g. Boiler not working in kitchen"
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.title ? "border-red-400" : "border-slate-200"}`} />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
              <select value={form.category} onChange={e => set("category", e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.category ? "border-red-400" : "border-slate-200"}`}>
                <option value="">Select category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority <span className="text-red-500">*</span></label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.priority ? "border-red-400" : "border-slate-200"}`}>
                <option value="">Select priority...</option>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority}</p>}
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description <span className="text-red-500">*</span></label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3}
                placeholder="Describe the issue in detail..."
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${errors.description ? "border-red-400" : "border-slate-200"}`} />
              {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
            </div>

            {/* Reported date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reported Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.date_reported} onChange={e => set("date_reported", e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.date_reported ? "border-red-400" : "border-slate-200"}`} />
              {errors.date_reported && <p className="text-xs text-red-500 mt-1">{errors.date_reported}</p>}
            </div>

            {/* Reported by */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reported By <span className="text-red-500">*</span></label>
              {isHighRank ? (
                <>
                  <AutocompleteInput 
                    value={form.reported_by_name} 
                    onChange={val => set("reported_by_name", val)}
                    options={staffList.map(s => s.full_name).filter(Boolean)}
                    placeholder="Search staff name..."
                  />
                  {errors.reported_by_name && <p className="text-xs text-red-500 mt-1">{errors.reported_by_name}</p>}
                </>
              ) : (
                <input value={staffProfile?.full_name || user?.full_name || ""} disabled
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
              )}
            </div>

            {/* Photo upload */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Upload Photo / Evidence</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading..." : "Choose File"}
                  <input type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
                </label>
                {form.photo_url && <span className="text-xs text-green-600 font-medium">✓ File uploaded</span>}
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Add Maintenance Issue"}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}