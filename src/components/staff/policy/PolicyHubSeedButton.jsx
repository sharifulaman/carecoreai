import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Database, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

export default function PolicyHubSeedButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleSeed = async () => {
    if (!window.confirm("This will DELETE all existing Policy Hub data and replace it with realistic demo data. Continue?")) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("seedPolicyHubData", {});
      if (res.data?.success) {
        setResult(res.data.summary);
        toast.success(`Policy Hub seeded: ${res.data.summary.policies} policies, ${res.data.summary.staff_assignments} assignments`);
      } else {
        toast.error(res.data?.error || "Seed failed");
      }
    } catch (e) {
      toast.error(e.message || "Seed failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Seed Demo Data</p>
            <p className="text-xs text-amber-600">Populate Policy Hub with realistic demo policies, assignments &amp; acknowledgements</p>
          </div>
        </div>
        <button
          onClick={handleSeed}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Seeding…</> : <><Database className="w-4 h-4" /> Load Demo Data</>}
        </button>
      </div>

      {result && (
        <div className="mt-3 border-t border-amber-200 pt-3">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Seeded successfully
            {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </button>
          {expanded && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(result).map(([k, v]) => (
                <div key={k} className="bg-white rounded-lg p-2 text-center border border-amber-100">
                  <p className="text-base font-bold text-amber-700">{v}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{k.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}