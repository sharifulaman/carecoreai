import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { logAudit } from "@/lib/logAudit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Phone, MapPin, AlertCircle, Save, Info } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";

export default function MyDetailsSection({ myProfile, user, onUpdated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    phone: myProfile?.phone || "",
    address: myProfile?.address || "",
    preferred_name: myProfile?.preferred_name || "",
    emergency_contact_name: myProfile?.emergency_contact_name || "",
    emergency_contact_phone: myProfile?.emergency_contact_phone || "",
    emergency_contact_relationship: myProfile?.emergency_contact_relationship || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await secureGateway.update("StaffProfile", myProfile.id, form);
      await logAudit({
        entity_name: "StaffProfile",
        entity_id: myProfile.id,
        action: "update",
        changed_by: user?.id,
        changed_by_name: user?.full_name || user?.email || "",
        old_values: {
          phone: myProfile.phone,
          address: myProfile.address,
          preferred_name: myProfile.preferred_name,
          emergency_contact_name: myProfile.emergency_contact_name,
          emergency_contact_phone: myProfile.emergency_contact_phone,
          emergency_contact_relationship: myProfile.emergency_contact_relationship,
        },
        new_values: form,
        org_id: ORG_ID,
        description: `Staff self-updated personal details — ${myProfile.full_name}`,
        retention_category: "employment",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sw-staff-profile"] });
      toast.success("Details updated");
      onUpdated?.();
    },
  });

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input
        type={type}
        className="mt-1"
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Read-only info */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Full Name</p>
          <p className="font-medium text-sm mt-0.5">{myProfile?.full_name}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="font-medium text-sm mt-0.5">{myProfile?.email}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Role</p>
          <p className="font-medium text-sm mt-0.5 capitalize">{myProfile?.role?.replace(/_/g, " ")}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Employee ID</p>
          <p className="font-medium text-sm mt-0.5 font-mono">{myProfile?.employee_id || "—"}</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Personal Details</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("Preferred Name / Pronouns", "preferred_name", "text", "e.g. Alex (they/them)")}
          {field("Phone Number", "phone", "tel", "e.g. 07700 900000")}
          {field("Home Address", "address", "text", "Your current address")}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Emergency Contact</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {field("Contact Name", "emergency_contact_name", "text", "Full name")}
          {field("Contact Phone", "emergency_contact_phone", "tel", "Phone number")}
          {field("Relationship", "emergency_contact_relationship", "text", "e.g. Partner, Parent")}
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>To update your bank details, tax code, NI number, or pay rate please contact your manager or administrator.</span>
      </div>

      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
        <Save className="w-4 h-4" />
        {saveMutation.isPending ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}