import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "notification_rules";

const DEFAULT_RULES = [
  { id: "1", event: "no_daily_log", label: "No daily log submitted", threshold_hours: 24, notify_role: "team_leader", enabled: true },
  { id: "2", event: "no_visit_report", label: "No visit report in X days", threshold_hours: 168, notify_role: "admin", enabled: true },
  { id: "3", event: "high_risk_flag", label: "Daily log flagged as high risk", threshold_hours: 0, notify_role: "admin", enabled: true },
  { id: "4", event: "accident_open", label: "Accident report left open", threshold_hours: 48, notify_role: "admin", enabled: false },
];

function loadRules() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

const EVENTS = [
  { value: "no_daily_log", label: "No daily log submitted" },
  { value: "no_visit_report", label: "No visit report submitted" },
  { value: "high_risk_flag", label: "Daily log flagged as high risk" },
  { value: "accident_open", label: "Accident report left open" },
  { value: "maintenance_overdue", label: "Maintenance issue overdue" },
  { value: "dbs_expiring", label: "Staff DBS expiring soon" },
];

const ROLES = ["admin", "team_leader", "support_worker"];

export default function NotificationRulesTab() {
  const [rules, setRules] = useState(loadRules);

  const update = (id, key, value) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [key]: value } : r));
  };

  const remove = (id) => setRules(prev => prev.filter(r => r.id !== id));

  const addRule = () => {
    setRules(prev => [...prev, {
      id: Date.now().toString(),
      event: "no_daily_log",
      label: "No daily log submitted",
      threshold_hours: 24,
      notify_role: "team_leader",
      enabled: true,
    }]);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    toast.success("Notification rules saved");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">Configure which events trigger alerts and who gets notified.</p>
        </div>
        <div className="divide-y divide-border">
          {rules.map(rule => (
            <div key={rule.id} className="px-6 py-4 flex flex-wrap items-center gap-4">
              <Switch
                checked={rule.enabled}
                onCheckedChange={v => update(rule.id, "enabled", v)}
              />
              <div className="flex-1 min-w-[180px]">
                <Select value={rule.event} onValueChange={v => {
                  const found = EVENTS.find(e => e.value === v);
                  update(rule.id, "event", v);
                  if (found) update(rule.id, "label", found.label);
                }}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENTS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">After</span>
                <Input
                  type="number"
                  min={0}
                  className="w-20 text-sm"
                  value={rule.threshold_hours}
                  onChange={e => update(rule.id, "threshold_hours", +e.target.value)}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">hours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Notify</span>
                <Select value={rule.notify_role} onValueChange={v => update(rule.id, "notify_role", v)}>
                  <SelectTrigger className="w-36 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <button onClick={() => remove(rule.id)} className="text-destructive hover:opacity-70">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border">
          <Button variant="outline" className="gap-2 rounded-lg text-sm" onClick={addRule}>
            <Plus className="w-4 h-4" /> Add Rule
          </Button>
        </div>
      </div>
      <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave}>
        Save Notification Rules
      </Button>
    </div>
  );
}