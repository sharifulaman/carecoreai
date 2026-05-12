import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, FileText, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  acknowledged: "bg-green-100 text-green-700",
  superseded: "bg-orange-100 text-orange-700",
};

export default function ContractTimeline({ staffId, user, isAdmin }) {
  const queryClient = useQueryClient();
  const [acknowledging, setAcknowledging] = useState(null);

  const { data: documents = [] } = useQuery({
    queryKey: ["staff-documents-contracts", staffId],
    queryFn: () => secureGateway.filter("StaffDocument", { staff_id: staffId, document_type: "employment_contract" }),
    staleTime: 5 * 60 * 1000,
  });

  const acknowledgeDoc = useMutation({
    mutationFn: async (docId) => {
      await secureGateway.update("StaffDocument", docId, {
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-documents-contracts"] });
      toast.success("Contract marked as acknowledged");
      setAcknowledging(null);
    },
  });

  const contracts = documents.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));

  if (contracts.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-xs">
        <FileText className="w-6 h-6 mx-auto mb-2 opacity-50" />
        No contracts yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((contract, idx) => (
        <div key={contract.id} className="border border-border rounded-lg p-3 bg-card/50">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{contract.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Generated {format(parseISO(contract.upload_date), "d MMM yyyy")}
                {contract.uploaded_by && " by " + contract.uploaded_by}
              </p>
            </div>
            <Badge className={`text-xs ${STATUS_COLORS[contract.status] || "bg-muted text-muted-foreground"}`}>
              {contract.status}
            </Badge>
          </div>

          {contract.status === "sent" && !contract.acknowledged_at && (
            <p className="text-xs text-amber-600 mb-2">⏳ Awaiting acknowledgement from staff member</p>
          )}

          {contract.status === "acknowledged" && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 mb-2">
              <CheckCircle className="w-3.5 h-3.5" />
              Acknowledged on {format(parseISO(contract.acknowledged_at), "d MMM yyyy")}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => window.open(contract.file_url, "_blank")}
            >
              <Download className="w-3 h-3" /> Download
            </Button>

            {contract.status === "sent" && !contract.acknowledged_at && (
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => acknowledgeDoc.mutate(contract.id)}
                disabled={acknowledging === contract.id || acknowledgeDoc.isPending}
              >
                {acknowledging === contract.id ? "Marking…" : "Mark as Acknowledged"}
              </Button>
            )}

            {idx === 0 && (
              <span className="text-xs text-primary font-semibold self-center">Current</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}