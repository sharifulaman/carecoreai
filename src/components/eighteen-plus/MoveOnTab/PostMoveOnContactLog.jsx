import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import PostMoveOnContactModal from "./PostMoveOnContactModal";

export default function PostMoveOnContactLog({ resident, contacts, plan }) {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const createContactMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.PostMoveOnContact.create({
        org_id: resident.org_id,
        resident_id: resident.id,
        move_on_plan_id: plan.id,
        ...data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-move-contacts", resident.id] });
      setShowModal(false);
    },
  });

  const daysSinceMoveOut = plan.move_out_date
    ? Math.floor((Date.now() - new Date(plan.move_out_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const noContactAlert = daysSinceMoveOut >= 28 && contacts.length === 0;
  const lastContactDays = contacts.length > 0
    ? Math.floor((Date.now() - new Date(contacts[0].contact_date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-muted/20 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Post Move-On Support</h3>
        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          className="gap-1"
        >
          <Plus className="w-3 h-3" /> Log Contact
        </Button>
      </div>

      {noContactAlert && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            {resident.display_name} moved out {daysSinceMoveOut} days ago. Have you made contact to check they are settled?
          </p>
        </div>
      )}

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No contact logged yet.</p>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg p-3 border border-border/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{new Date(contact.contact_date).toLocaleDateString()} • {contact.contact_type}</p>
                  <p className="text-xs text-muted-foreground">{contact.worker_name}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${contact.tenancy_stable ? "text-green-600" : "text-amber-600"}`}>
                    {contact.tenancy_stable ? "Stable" : "Concerns"}
                  </p>
                </div>
              </div>
              {contact.crisis_notes && (
                <p className="text-xs text-red-600 mb-2">Crisis: {contact.crisis_notes}</p>
              )}
              {contact.notes && (
                <p className="text-xs text-muted-foreground">{contact.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PostMoveOnContactModal
          resident={resident}
          plan={plan}
          onClose={() => setShowModal(false)}
          onSave={(data) => createContactMutation.mutate(data)}
        />
      )}
    </div>
  );
}