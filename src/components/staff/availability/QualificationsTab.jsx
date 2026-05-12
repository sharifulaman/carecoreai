import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Save } from "lucide-react";

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const daysLeft = Math.ceil((d - now) / 86400000);
  if (daysLeft < 0) return { label: "EXPIRED", color: "text-red-600 bg-red-50", days: daysLeft };
  if (daysLeft <= 7) return { label: `Expires in ${daysLeft} days`, color: "text-red-600 bg-red-50", days: daysLeft };
  if (daysLeft <= 30) return { label: `Expires in ${daysLeft} days`, color: "text-amber-600 bg-amber-50", days: daysLeft };
  if (daysLeft <= 60) return { label: `Expires in ${daysLeft} days`, color: "text-yellow-600 bg-yellow-50", days: daysLeft };
  return { label: "Valid", color: "text-green-600 bg-green-50", days: daysLeft };
}

function ExpiryBadge({ date }) {
  const s = expiryStatus(date);
  if (!s) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.color} flex items-center gap-1 w-fit mt-1`}>
      {s.days < 0 ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
      {s.label}
    </span>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-primary" : "bg-muted-foreground/40"}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function QualificationsTab({ staffMember, user }) {
  const queryClient = useQueryClient();
  const isAdminOrTL = user?.role === "admin" || user?.role === "team_leader";

  const { data: profiles = [] } = useQuery({
    queryKey: ["avail-profile", staffMember.id],
    queryFn: () => base44.entities.StaffAvailabilityProfile.filter({ org_id: ORG_ID, staff_id: staffMember.id }),
  });
  const profile = profiles[0] || null;

  const [form, setForm] = useState({
    sleep_in_qualified: profile?.sleep_in_qualified ?? false,
    waking_night_qualified: profile?.waking_night_qualified ?? false,
    driving_licence: profile?.driving_licence ?? false,
    vehicle_available: profile?.vehicle_available ?? false,
    first_aid_certified: profile?.first_aid_certified ?? false,
    first_aid_expiry: profile?.first_aid_expiry ?? "",
    medication_trained: profile?.medication_trained ?? false,
    medication_training_date: profile?.medication_training_date ?? "",
    medication_training_expiry: profile?.medication_training_expiry ?? "",
    manual_handling_trained: profile?.manual_handling_trained ?? false,
    manual_handling_expiry: profile?.manual_handling_expiry ?? "",
    safeguarding_trained: profile?.safeguarding_trained ?? false,
    safeguarding_level: profile?.safeguarding_level ?? "",
    safeguarding_expiry: profile?.safeguarding_expiry ?? "",
  });

  // Sync form when profile loads
  useState(() => {
    if (profile) {
      setForm({
        sleep_in_qualified: profile.sleep_in_qualified ?? false,
        waking_night_qualified: profile.waking_night_qualified ?? false,
        driving_licence: profile.driving_licence ?? false,
        vehicle_available: profile.vehicle_available ?? false,
        first_aid_certified: profile.first_aid_certified ?? false,
        first_aid_expiry: profile.first_aid_expiry ?? "",
        medication_trained: profile.medication_trained ?? false,
        medication_training_date: profile.medication_training_date ?? "",
        medication_training_expiry: profile.medication_training_expiry ?? "",
        manual_handling_trained: profile.manual_handling_trained ?? false,
        manual_handling_expiry: profile.manual_handling_expiry ?? "",
        safeguarding_trained: profile.safeguarding_trained ?? false,
        safeguarding_level: profile.safeguarding_level ?? "",
        safeguarding_expiry: profile.safeguarding_expiry ?? "",
      });
    }
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: (data) => profile
      ? base44.entities.StaffAvailabilityProfile.update(profile.id, data)
      : Promise.resolve(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["avail-profile", staffMember.id] }); toast.success("Qualifications saved"); },
  });

  // DBS from StaffProfile
  const dbsExpiry = staffMember.dbs_expiry;
  const dbsStatus = expiryStatus(dbsExpiry);

  const readOnly = !isAdminOrTL;

  return (
    <div className="space-y-5 p-1">
      {/* DBS */}
      <div>
        <h3 className="text-sm font-semibold mb-3 border-b pb-1.5">DBS Check</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">DBS Number</p><p className="font-medium">{staffMember.dbs_number || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">DBS Expiry</p>
            <p className="font-medium">{dbsExpiry || "—"}</p>
            <ExpiryBadge date={dbsExpiry} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Edit DBS details on the main staff profile.</p>
      </div>

      {!profile && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">Set up an availability profile (Profile tab) to add training records.</p>
      )}

      {profile && (
        <>
          {/* Shift Authorisations */}
          <div>
            <h3 className="text-sm font-semibold mb-3 border-b pb-1.5">Shift Authorisations</h3>
            <div className="space-y-2.5">
              {[
                { key: "sleep_in_qualified", label: "Sleep-In Qualified", yes: "Authorised for sleeping shifts", no: "Not authorised for sleeping shifts" },
                { key: "waking_night_qualified", label: "Waking Night Qualified" },
                { key: "driving_licence", label: "Driving Licence" },
              ].map(({ key, label, yes, no }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">{label}</Label>
                    {yes && <p className={`text-xs mt-0.5 ${form[key] ? "text-green-600" : "text-muted-foreground"}`}>{form[key] ? yes : no}</p>}
                  </div>
                  {readOnly ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${form[key] ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{form[key] ? "Yes" : "No"}</span>
                  ) : (
                    <Toggle value={form[key]} onChange={v => set(key, v)} />
                  )}
                </div>
              ))}
              {form.driving_licence && (
                <div className="flex items-center justify-between pl-4 border-l-2 border-border">
                  <Label className="text-sm">Vehicle Available</Label>
                  {readOnly ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${form.vehicle_available ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{form.vehicle_available ? "Yes" : "No"}</span>
                  ) : (
                    <Toggle value={form.vehicle_available} onChange={v => set("vehicle_available", v)} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Medical & Care Training */}
          <div>
            <h3 className="text-sm font-semibold mb-3 border-b pb-1.5">Medical & Care Training</h3>
            <div className="space-y-3">
              {/* Medication */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm">Medication Administration</Label>
                  {readOnly ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${form.medication_trained ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{form.medication_trained ? "Yes" : "No"}</span>
                  ) : (
                    <Toggle value={form.medication_trained} onChange={v => set("medication_trained", v)} />
                  )}
                </div>
                {form.medication_trained && (
                  <div className="grid grid-cols-2 gap-2 pl-3 border-l-2 border-border">
                    <div><Label className="text-xs">Training Date</Label><Input type="date" value={form.medication_training_date} onChange={e => set("medication_training_date", e.target.value)} className="mt-0.5 h-8 text-xs" disabled={readOnly} /></div>
                    <div><Label className="text-xs">Expiry Date</Label><Input type="date" value={form.medication_training_expiry} onChange={e => set("medication_training_expiry", e.target.value)} className="mt-0.5 h-8 text-xs" disabled={readOnly} />
                      <ExpiryBadge date={form.medication_training_expiry} /></div>
                  </div>
                )}
              </div>
              {/* First Aid */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm">First Aid Certified</Label>
                  {readOnly ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${form.first_aid_certified ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{form.first_aid_certified ? "Yes" : "No"}</span>
                  ) : (
                    <Toggle value={form.first_aid_certified} onChange={v => set("first_aid_certified", v)} />
                  )}
                </div>
                {form.first_aid_certified && (
                  <div className="pl-3 border-l-2 border-border">
                    <Label className="text-xs">Expiry Date</Label>
                    <Input type="date" value={form.first_aid_expiry} onChange={e => set("first_aid_expiry", e.target.value)} className="mt-0.5 h-8 text-xs" disabled={readOnly} />
                    <ExpiryBadge date={form.first_aid_expiry} />
                  </div>
                )}
              </div>
              {/* Manual Handling */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm">Manual Handling</Label>
                  {readOnly ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${form.manual_handling_trained ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{form.manual_handling_trained ? "Yes" : "No"}</span>
                  ) : (
                    <Toggle value={form.manual_handling_trained} onChange={v => set("manual_handling_trained", v)} />
                  )}
                </div>
                {form.manual_handling_trained && (
                  <div className="pl-3 border-l-2 border-border">
                    <Label className="text-xs">Expiry Date</Label>
                    <Input type="date" value={form.manual_handling_expiry} onChange={e => set("manual_handling_expiry", e.target.value)} className="mt-0.5 h-8 text-xs" disabled={readOnly} />
                    <ExpiryBadge date={form.manual_handling_expiry} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Safeguarding */}
          <div>
            <h3 className="text-sm font-semibold mb-3 border-b pb-1.5">Safeguarding</h3>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Safeguarding Trained</Label>
              {readOnly ? (
                <span className={`text-xs px-2 py-0.5 rounded-full ${form.safeguarding_trained ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{form.safeguarding_trained ? "Yes" : "No"}</span>
              ) : (
                <Toggle value={form.safeguarding_trained} onChange={v => set("safeguarding_trained", v)} />
              )}
            </div>
            {form.safeguarding_trained && (
              <div className="grid grid-cols-2 gap-2 pl-3 border-l-2 border-border">
                <div>
                  <Label className="text-xs">Level</Label>
                  <Select value={form.safeguarding_level} onValueChange={v => set("safeguarding_level", v)} disabled={readOnly}>
                    <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue placeholder="Select level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="level_1">Level 1</SelectItem>
                      <SelectItem value="level_2">Level 2</SelectItem>
                      <SelectItem value="level_3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Expiry Date</Label>
                  <Input type="date" value={form.safeguarding_expiry} onChange={e => set("safeguarding_expiry", e.target.value)} className="mt-0.5 h-8 text-xs" disabled={readOnly} />
                  <ExpiryBadge date={form.safeguarding_expiry} />
                </div>
              </div>
            )}
          </div>

          {!readOnly && (
            <Button className="w-full gap-1.5" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              <Save className="w-3.5 h-3.5" />{saveMutation.isPending ? "Saving..." : "Save Qualifications"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}