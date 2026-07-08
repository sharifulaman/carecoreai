import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { saveSettings, clearSettingsCache } from "@/lib/orgSettings";

export default function CareSettingsTab() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings({ care_settings: {} });
      clearSettingsCache();
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <p className="text-muted-foreground text-sm">Care settings configuration coming soon. Default settings are in place.</p>
      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}