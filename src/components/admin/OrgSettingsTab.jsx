import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

export default function OrgSettingsTab() {
  const qc = useQueryClient();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organisation"],
    queryFn: () => base44.entities.Organisation.filter({ org_id: ORG_ID }),
  });

  const org = orgs[0] || null;

  const [form, setForm] = useState({
    name: "",
    app_name: "CareCore AI",
    contact_email: "",
    primary_colour: "#4B8BF5",
    default_language: "en",
    default_theme: "light",
    session_timeout_hours: 8,
    failed_login_attempts_limit: 5,
    lockout_duration_minutes: 15,
    min_password_length: 8,
    require_number: true,
    require_special_char: false,
    gps_clock_in_enabled: false,
  });

  useEffect(() => {
    if (org) {
      setForm(prev => ({ ...prev, ...org }));
    }
  }, [org]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Organisation.create({ ...data, org_id: ORG_ID }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organisation"] }); toast.success("Organisation settings saved"); },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Organisation.update(org.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["organisation"] }); toast.success("Organisation settings saved"); },
  });

  const handleSave = () => {
    if (org) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Branding */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Branding</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Organisation Name</Label>
            <Input className="mt-1.5" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <Label>App Name</Label>
            <Input className="mt-1.5" value={form.app_name} onChange={e => set("app_name", e.target.value)} />
          </div>
          <div>
            <Label>Contact Email</Label>
            <Input type="email" className="mt-1.5" value={form.contact_email} onChange={e => set("contact_email", e.target.value)} />
          </div>
          <div>
            <Label>Primary Colour</Label>
            <div className="flex items-center gap-3 mt-1.5">
              <input type="color" value={form.primary_colour} onChange={e => set("primary_colour", e.target.value)} className="h-9 w-16 rounded border border-border cursor-pointer" />
              <Input value={form.primary_colour} onChange={e => set("primary_colour", e.target.value)} className="flex-1" />
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Default Language</Label>
            <Select value={form.default_language} onValueChange={v => set("default_language", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="cy">Welsh</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default Theme</Label>
            <Select value={form.default_theme} onValueChange={v => set("default_theme", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Security & Session</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Session Timeout (hours)</Label>
            <Input type="number" className="mt-1.5" value={form.session_timeout_hours} onChange={e => set("session_timeout_hours", +e.target.value)} min={1} />
          </div>
          <div>
            <Label>Max Failed Login Attempts</Label>
            <Input type="number" className="mt-1.5" value={form.failed_login_attempts_limit} onChange={e => set("failed_login_attempts_limit", +e.target.value)} min={1} />
          </div>
          <div>
            <Label>Lockout Duration (minutes)</Label>
            <Input type="number" className="mt-1.5" value={form.lockout_duration_minutes} onChange={e => set("lockout_duration_minutes", +e.target.value)} min={1} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Min Password Length</Label>
            <Input type="number" className="mt-1.5" value={form.min_password_length} onChange={e => set("min_password_length", +e.target.value)} min={6} />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require Number in Password</p>
              <p className="text-xs text-muted-foreground">Password must contain at least one number</p>
            </div>
            <Switch checked={form.require_number} onCheckedChange={v => set("require_number", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require Special Character</p>
              <p className="text-xs text-muted-foreground">Password must contain a special character</p>
            </div>
            <Switch checked={form.require_special_char} onCheckedChange={v => set("require_special_char", v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">GPS Clock-In</p>
              <p className="text-xs text-muted-foreground">Require staff to be at the home location when clocking in</p>
            </div>
            <Switch checked={form.gps_clock_in_enabled} onCheckedChange={v => set("gps_clock_in_enabled", v)} />
          </div>
        </div>
      </div>

      <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save Organisation Settings"}
      </Button>
    </div>
  );
}