import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { X, Plus, AlertTriangle, ChevronRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import BodyMapSilhouette from "./BodyMapSilhouette";
import BodyMapForm from "./BodyMapForm";

const MARK_TYPE_COLORS = {
  bruise: "bg-red-100 text-red-700",
  cut: "bg-red-100 text-red-700",
  scratch: "bg-red-100 text-red-700",
  burn: "bg-orange-100 text-orange-700",
  bite: "bg-red-100 text-red-700",
  rash: "bg-yellow-100 text-yellow-700",
  swelling: "bg-red-100 text-red-700",
  self_harm: "bg-orange-100 text-orange-700",
  tattoo: "bg-gray-100 text-gray-700",
  other: "bg-slate-100 text-slate-700",
};

function BodyMapRecordDetail({ record, resident, onBack }) {
  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="text-slate-400">/</span>
        <span className="text-sm font-semibold text-slate-800">
          Body Map — {new Date(record.recorded_datetime).toLocaleDateString("en-GB")}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Safeguarding alert */}
        {record.safeguarding_concern && (
          <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex gap-2">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-bold">Safeguarding Concern Flagged</p>
              <p>Referred to: {record.referred_to || "—"}</p>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Recorded By</p>
            <p className="font-medium text-slate-800">{record.recorded_by_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Date &amp; Time</p>
            <p className="font-medium text-slate-800">
              {new Date(record.recorded_datetime).toLocaleString("en-GB")}
            </p>
          </div>
          {record.discovery_circumstance && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-0.5">Discovery Circumstance</p>
              <p className="font-medium text-slate-800">{record.discovery_circumstance}</p>
            </div>
          )}
        </div>

        {/* Body Map Silhouettes */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-4">Body Map</h4>
          <div className="grid grid-cols-2 gap-6">
            <BodyMapSilhouette side="front" marks={record.marks || []} readOnly />
            <BodyMapSilhouette side="back" marks={record.marks || []} readOnly />
          </div>
        </div>

        {/* Marks */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">
            {(record.marks || []).length} Mark(s)
          </h4>
          {record.marks && record.marks.length > 0 ? (
            <div className="space-y-2">
              {record.marks.map((mark, i) => (
                <div key={mark.id || i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-slate-800">{mark.body_location} ({mark.body_side})</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${MARK_TYPE_COLORS[mark.mark_type] || "bg-slate-100 text-slate-700"}`}>
                      {mark.mark_type?.replace("_", " ")}
                    </span>
                  </div>
                  {(mark.colour || mark.size_cm) && (
                    <p className="text-xs text-slate-500">{[mark.colour, mark.size_cm].filter(Boolean).join(" · ")}</p>
                  )}
                  {mark.description && <p className="text-xs mt-1"><strong>Description:</strong> {mark.description}</p>}
                  {mark.child_explanation && <p className="text-xs mt-1"><strong>Child's explanation:</strong> {mark.child_explanation}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No marks recorded.</p>
          )}
        </div>

        {/* Assessment */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Assessment</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Consistent with Explanation</p>
              <p className="font-medium text-slate-800">
                {record.consistent_with_explanation === true
                  ? "Yes"
                  : record.consistent_with_explanation === false
                  ? "No / Unclear"
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Manager Notified</p>
              <p className="font-medium text-slate-800">{record.manager_notified ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="font-medium text-slate-800 capitalize">{record.status || "open"}</p>
            </div>
            {record.notes && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500">Notes</p>
                <p className="font-medium text-slate-800">{record.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BodyMapModal({ resident, staff, user, onClose }) {
  const qc = useQueryClient();
  const [view, setView] = useState("list"); // "list" | "detail" | "new"
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: bodyMaps = [], isLoading } = useQuery({
    queryKey: ["body-maps", resident?.id],
    queryFn: () => secureGateway.filter("BodyMap", { resident_id: resident.id }, "-recorded_datetime", 50),
    enabled: !!resident?.id,
  });

  const handleRecordClick = (record) => {
    setSelectedRecord(record);
    setView("detail");
  };

  const handleNewSaved = () => {
    qc.invalidateQueries({ queryKey: ["body-maps", resident?.id] });
    setView("list");
  };

  // Show the BodyMapForm as its own full-screen modal
  if (view === "new") {
    return (
      <BodyMapForm
        resident={resident}
        staff={staff || []}
        user={user}
        onClose={() => setView("list")}
        onSave={handleNewSaved}
      />
    );
  }

  const concernCount = bodyMaps.filter((bm) => bm.safeguarding_concern).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Body Map — {resident.display_name}</h2>
              <p className="text-xs text-slate-500">{bodyMaps.length} record(s){concernCount > 0 ? ` · ${concernCount} safeguarding concern(s)` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setView("new")}
            >
              <Plus className="w-4 h-4" /> New Body Map
            </Button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {view === "detail" && selectedRecord ? (
            <BodyMapRecordDetail
              record={selectedRecord}
              resident={resident}
              onBack={() => { setSelectedRecord(null); setView("list"); }}
            />
          ) : (
            <div className="overflow-y-auto h-full">
              {/* Safeguarding banner */}
              {concernCount > 0 && (
                <div className="mx-6 mt-5 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">
                    {concernCount} body map(s) with a safeguarding concern flagged.
                  </p>
                </div>
              )}

              {isLoading ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">Loading body maps…</div>
              ) : bodyMaps.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium mb-1">No Body Maps Recorded</p>
                  <p className="text-slate-400 text-sm mb-5">Click "New Body Map" above to create the first one.</p>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-2">
                  {bodyMaps.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => handleRecordClick(bm)}
                      className="w-full text-left p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bm.safeguarding_concern ? "bg-red-100" : "bg-slate-100"}`}>
                          {bm.safeguarding_concern
                            ? <AlertTriangle className="w-4 h-4 text-red-600" />
                            : <Activity className="w-4 h-4 text-slate-500" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-800">
                            {new Date(bm.recorded_datetime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {bm.marks?.length || 0} mark(s) · Recorded by {bm.recorded_by_name || "Unknown"}
                            {bm.safeguarding_concern && <span className="ml-2 text-red-600 font-medium">⚠ Safeguarding concern</span>}
                          </p>
                          {bm.discovery_circumstance && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{bm.discovery_circumstance}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bm.status === "open" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {bm.status || "open"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
