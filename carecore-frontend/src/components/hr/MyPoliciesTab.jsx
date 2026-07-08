import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORG_ID } from "@/lib/roleConfig";

export default function MyPoliciesTab({ staffProfile }) {
  const [viewingPolicy, setViewingPolicy] = useState(null);

  // Fetch staff's acknowledgements
  const { data: acknowledgements = [] } = useQuery({
    queryKey: ["my-policies", staffProfile?.id],
    queryFn: () => staffProfile ? base44.entities.PolicyAcknowledgement.filter({
      org_id: ORG_ID,
      staff_id: staffProfile.id,
      is_deleted: false
    }, "-created_date", 100) : Promise.resolve([]),
    staleTime: 60000,
  });

  // Fetch policies
  const { data: policies = [] } = useQuery({
    queryKey: ["my-policies-list"],
    queryFn: () => base44.entities.ChildProtectionPolicy.filter({
      org_id: ORG_ID,
      status: "active",
      is_deleted: false
    }, null, 100),
    staleTime: 60000,
  });

  // Outstanding acknowledgements
  const outstanding = useMemo(() => 
    acknowledgements.filter(a => !a.acknowledged),
    [acknowledgements]
  );

  // Acknowledged policies
  const acknowledged = useMemo(() => 
    acknowledgements.filter(a => a.acknowledged),
    [acknowledgements]
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">My Policies</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review and acknowledge policies that apply to you.
        </p>
      </div>

      {/* Outstanding */}
      {outstanding.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-amber-700">Pending Your Acknowledgement</p>
          {outstanding.map((ack) => {
            const policy = policies.find(p => p.id === ack.policy_id);
            return (
              <div key={ack.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">{ack.policy_title}</p>
                    <p className="text-sm text-muted-foreground mt-1">Version {ack.policy_version}</p>
                    {ack.acknowledgement_deadline && (
                      <p className="text-xs text-amber-700 font-semibold mt-2">
                        Due by {format(new Date(ack.acknowledgement_deadline), "dd MMMM yyyy")}
                        {ack.is_overdue && " — OVERDUE"}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setViewingPolicy(ack)}
                    className="ml-4"
                  >
                    Read & Acknowledge
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Acknowledged */}
      {acknowledged.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-green-700">Acknowledged</p>
          {acknowledged.map((ack) => (
            <div key={ack.id} className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <p className="font-semibold text-green-900">{ack.policy_title}</p>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Acknowledged on {format(new Date(ack.acknowledged_at), "dd MMMM yyyy")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingPolicy(ack)}
                >
                  Read
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outstanding.length === 0 && acknowledged.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">No policies to acknowledge at this time.</p>
        </div>
      )}
    </div>
  );
}