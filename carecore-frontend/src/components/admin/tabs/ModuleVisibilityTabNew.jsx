import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";

const MODULES = [
  { id: "dashboard", label: "Dashboard", admin: true, tl: true, sw: true, locked: false },
  { id: "young_people", label: "Young People", admin: true, tl: true, sw: true, locked: false },
  { id: "my_homes", label: "My Homes", admin: true, tl: true, sw: true, locked: false },
  { id: "24_hours", label: "24 Hours Housing", admin: true, tl: true, sw: true, locked: false },
  { id: "my_shifts", label: "My Shifts", admin: true, tl: true, sw: true, locked: false },
  { id: "shifts_rota", label: "Shifts and Rota", admin: true, tl: true, sw: false, locked: false },
  { id: "finance", label: "Finance", admin: true, tl: true, sw: false, locked: false },
  { id: "care", label: "Care", admin: true, tl: true, sw: true, locked: false },
  { id: "18_plus", label: "18+ Module", admin: true, tl: true, sw: true, locked: false },
  { id: "sw_perf", label: "SW Performance", admin: true, tl: true, sw: true, locked: false },
  { id: "analytics", label: "Analytics", admin: true, tl: true, sw: false, locked: false },
  { id: "messages", label: "Messages", admin: true, tl: true, sw: true, locked: false },
  { id: "settings", label: "Settings", admin: true, tl: false, sw: false, locked: true },
  { id: "staff_hr", label: "Staff and HR", admin: true, tl: true, sw: false, locked: false },
  { id: "risk", label: "Risk Management", admin: true, tl: true, sw: true, locked: false },
];

export default function ModuleVisibilityTabNew() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const moduleVis = await getSetting("module_visibility", {});
      setVisibility(moduleVis);
    } catch (error) {
      console.error("Failed to load module visibility:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId, role) => {
    const key = `${moduleId}_${role}`;
    setVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings({ module_visibility: visibility });
      clearSettingsCache();
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Module Visibility by Role</h3>
        <p className="text-sm text-muted-foreground">Green = visible, grey = hidden</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 font-medium">Module Name</th>
                <th className="text-center px-4 py-2 font-medium">Admin</th>
                <th className="text-center px-4 py-2 font-medium">Team Leader</th>
                <th className="text-center px-4 py-2 font-medium">Support Worker</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map(module => (
                <tr key={module.id} className="border-b border-border/50">
                  <td className="px-4 py-3">{module.label}</td>
                  <td className="text-center px-4 py-3">
                    <div className="flex justify-center">
                      <input 
                        type="checkbox" 
                        disabled={module.locked}
                        checked={visibility[`${module.id}_admin`] !== false && module.admin}
                        onChange={() => toggleModule(module.id, "admin")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="text-center px-4 py-3">
                    <div className="flex justify-center">
                      <input 
                        type="checkbox" 
                        disabled={module.locked}
                        checked={visibility[`${module.id}_tl`] !== false && module.tl}
                        onChange={() => toggleModule(module.id, "tl")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="text-center px-4 py-3">
                    <div className="flex justify-center">
                      <input 
                        type="checkbox" 
                        disabled={module.locked}
                        checked={visibility[`${module.id}_sw`] !== false && module.sw}
                        onChange={() => toggleModule(module.id, "sw")}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}