import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, AlertTriangle, Wrench, CheckCircle } from "lucide-react";

const ISSUE_TYPES = [
  { value: "damage", label: "Damaged / Broken", icon: "💥" },
  { value: "missing", label: "Missing / Lost", icon: "❓" },
  { value: "maintenance", label: "Needs Maintenance", icon: "🔧" },
  { value: "safety", label: "Safety Concern", icon: "⚠️" },
  { value: "other", label: "Other Issue", icon: "📋" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function ReportIssueModal({ asset, user, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1 = form, 2 = success
  const [issueType, setIssueType] = useState("");
  const [priority, setPriority] = useState("medium");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.PropertyMaintenance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-issues"] });
      queryClient.invalidateQueries({ queryKey: ["asset-maintenance", asset?.id] });
      setStep(2);
    },
  });

  const validate = () => {
    const e = {};
    if (!issueType) e.issueType = "Please select an issue type";
    if (!description.trim()) e.description = "Please describe the issue";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const selectedType = ISSUE_TYPES.find(t => t.value === issueType);

    mutation.mutate({
      issue_title: `${selectedType?.label} — ${asset?.asset_name || "Asset"}`,
      description,
      priority,
      category: "appliance",
      status: "reported",
      home_id: asset?.home_id,
      home_name: asset?.home_name,
      asset_id: asset?.id,
      asset_name: asset?.asset_name,
      asset_code: asset?.asset_id,
      reported_by: user?.email || null,
      reported_at: new Date().toISOString(),
      issue_type: issueType,
      org_id: "default",
    });
  };

  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Issue Reported!</h2>
          <p className="text-sm text-gray-500 mb-2">
            Your issue has been logged and assigned to the maintenance team.
          </p>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 font-mono mb-6">
            Asset: {asset?.asset_name} · Priority: {priority}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { onSuccess?.(); onClose(); }}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Report an Issue</h2>
              <p className="text-xs text-gray-500">{asset?.asset_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Issue type */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2.5">
              What type of issue? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ISSUE_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setIssueType(t.value); setErrors(p => ({ ...p, issueType: null })); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    issueType === t.value
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
            {errors.issueType && <p className="text-xs text-red-500 mt-1">{errors.issueType}</p>}
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map(p => {
                const colors = {
                  low: "border-slate-300 bg-slate-50 text-slate-700",
                  medium: "border-amber-300 bg-amber-50 text-amber-700",
                  high: "border-orange-300 bg-orange-50 text-orange-700",
                  urgent: "border-red-400 bg-red-50 text-red-700",
                };
                const activeColors = {
                  low: "border-slate-500 bg-slate-200",
                  medium: "border-amber-500 bg-amber-200",
                  high: "border-orange-500 bg-orange-200",
                  urgent: "border-red-600 bg-red-200",
                };
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-3 py-2 rounded-lg border-2 text-xs font-bold capitalize transition-all ${
                      priority === p ? activeColors[p] : colors[p]
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Describe the issue <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => { setDescription(e.target.value); setErrors(p => ({ ...p, description: null })); }}
              placeholder="Please describe the issue in detail. What happened? When did you notice it? Any safety concerns?"
              rows={4}
              className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-0 resize-none transition-colors ${
                errors.description ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-blue-400"
              }`}
            />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Reporting as */}
          {user && (
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                {(user.full_name || user.email || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700">Reporting as</p>
                <p className="text-xs text-gray-500">{user.full_name || user.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-60"
          >
            <Wrench className="w-4 h-4" />
            {mutation.isPending ? "Submitting..." : "Submit Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}
