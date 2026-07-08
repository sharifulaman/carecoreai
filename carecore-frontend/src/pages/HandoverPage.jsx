import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Home } from "lucide-react";
import ShiftHandoverPage from "@/components/handover/ShiftHandoverPage";
import { ORG_ID } from "@/lib/roleConfig";

export default function HandoverPage() {
  const { user, staffProfile } = useOutletContext();
  const [selectedHomeId, setSelectedHomeId] = useState("");

  const { data: homes = [], isLoading } = useQuery({
    queryKey: ["homes-handover", user?.id],
    queryFn: async () => {
      let activeHomes = await base44.entities.Home.filter({ status: "active", org_id: ORG_ID });
      
      // If not admin, restrict to staff's assigned homes
      if (staffProfile?.role !== "admin" && staffProfile?.home_ids?.length > 0) {
        activeHomes = activeHomes.filter(h => staffProfile.home_ids.includes(h.id));
      }
      return activeHomes;
    },
  });

  useEffect(() => {
    if (homes.length > 0 && !selectedHomeId) {
      // Default to primary home if available, otherwise first home
      const defaultHome = staffProfile?.primary_home_id 
        ? homes.find(h => h.id === staffProfile.primary_home_id) || homes[0]
        : homes[0];
      setSelectedHomeId(defaultHome.id);
    }
  }, [homes, selectedHomeId, staffProfile]);

  const selectedHome = homes.find(h => h.id === selectedHomeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Global Shift Handover</h2>
          <p className="text-sm text-slate-500 mt-0.5">Select a home to manage its handovers</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shadow-sm min-w-[250px]">
          <Home className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={selectedHomeId}
            onChange={(e) => setSelectedHomeId(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-transparent focus:outline-none w-full cursor-pointer"
          >
            <option value="" disabled>Select a Home</option>
            {homes.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedHome ? (
        <div className="mt-4">
          <ShiftHandoverPage home={selectedHome} user={user} staffProfile={staffProfile} />
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500">Please select a home to continue.</p>
        </div>
      )}
    </div>
  );
}
