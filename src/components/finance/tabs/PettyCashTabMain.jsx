import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { fmtGBP } from "@/lib/ukLocalAuthorities";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import PettyCashTab from "../PettyCashTab";

export default function PettyCashTabMain({ visibleHomes, isAdmin, isSW }) {
  const [selectedHomeId, setSelectedHomeId] = useState(visibleHomes[0]?.id || "");

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-all"],
    queryFn: () => secureGateway.filter("StaffProfile", { status: "active" }),
  });

  return (
    <div className="space-y-5">
      {/* Home Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium shrink-0">Select Home:</label>
        <NativeSelect value={selectedHomeId} onValueChange={setSelectedHomeId} placeholder="Select a home…" className="w-64">
          {visibleHomes.map(h => (
            <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
          ))}
        </NativeSelect>
      </div>

      {selectedHomeId ? (
        <PettyCashTab homeId={selectedHomeId} staff={staff} />
      ) : (
        <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground">
          Select a home to view petty cash
        </div>
      )}
    </div>
  );
}