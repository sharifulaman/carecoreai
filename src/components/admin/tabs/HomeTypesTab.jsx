import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin, Clock, Heart, Key, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const HOME_TYPES = [
  { id: 'outreach', label: 'Outreach', icon: MapPin, description: 'Floating support and outreach services. Staff visit residents in the community.' },
  { id: '24_hours', label: '24 Hours Housing', icon: Clock, description: '24-hour residential care with sleeping shifts, waking nights, and full shift rota management.' },
  { id: 'care', label: 'Care Services', icon: Heart, description: 'Registered care homes including adult care, elderly care, and specialist residential services.' },
  { id: '18_plus', label: '18+ Accommodation', icon: Key, description: 'Supported accommodation for young adults transitioning to independence. Includes transition planning and ILS tracking.' },
];

export default function HomeTypesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTypes, setActiveTypes] = useState(['outreach', '24_hours', 'care', '18_plus']);
  const [warningModal, setWarningModal] = useState(null);
  const [pendingToggle, setPendingToggle] = useState(null);

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-all"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: "active" }),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-all"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, status: "active" }),
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const types = await getSetting('active_home_types', ['outreach', '24_hours', 'care', '18_plus']);
      setActiveTypes(types);
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (typeId) => {
    const isCurrentlyActive = activeTypes.includes(typeId);
    
    if (isCurrentlyActive) {
      // Deactivating — check for warnings
      const homesOfType = homes.filter(h => h.type === typeId);
      const residentCount = residents.filter(r => homesOfType.some(h => h.id === r.home_id)).length;
      
      if (residentCount > 0 || homesOfType.length > 0) {
        setWarningModal({ typeId, homeCount: homesOfType.length, residentCount });
        setPendingToggle(typeId);
        return;
      }
    }
    
    // Safe to toggle
    const newActive = isCurrentlyActive 
      ? activeTypes.filter(t => t !== typeId) 
      : [...activeTypes, typeId];
    setActiveTypes(newActive);
  };

  const confirmToggle = async () => {
    const newActive = activeTypes.includes(pendingToggle)
      ? activeTypes.filter(t => t !== pendingToggle)
      : [...activeTypes, pendingToggle];
    setActiveTypes(newActive);
    setWarningModal(null);
    setPendingToggle(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveSettings({ active_home_types: activeTypes });
      clearSettingsCache();
      toast.success("Home type settings saved successfully");
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
      <div>
        <h3 className="font-semibold text-lg">Home Types</h3>
        <p className="text-sm text-muted-foreground mt-1">Control which home types are active for your organisation. Deactivating a type hides those homes from all views but does not delete any data.</p>
      </div>

      {/* Warning Modal */}
      {warningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border p-6 max-w-md shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Deactivate {HOME_TYPES.find(t => t.id === warningModal.typeId)?.label}?</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  This will hide {warningModal.homeCount} home{warningModal.homeCount !== 1 ? 's' : ''} with {warningModal.residentCount} active resident{warningModal.residentCount !== 1 ? 's' : ''} from all views. No data will be deleted. You can reactivate at any time.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setWarningModal(null); setPendingToggle(null); }}>Cancel</Button>
              <Button variant="destructive" onClick={confirmToggle}>Deactivate</Button>
            </div>
          </div>
        </div>
      )}

      {/* Home Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {HOME_TYPES.map(type => {
          const Icon = type.icon;
          const isActive = activeTypes.includes(type.id);
          const typedHomes = homes.filter(h => h.type === type.id);
          const typedResidents = residents.filter(r => typedHomes.some(h => h.id === r.home_id));
          
          return (
            <div key={type.id} className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Icon className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h4 className="font-semibold">{type.label}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>{typedHomes.length} active home{typedHomes.length !== 1 ? 's' : ''}, {typedResidents.length} active resident{typedResidents.length !== 1 ? 's' : ''}</p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-sm font-medium">{isActive ? 'Active' : 'Inactive'}</span>
                <Switch 
                  checked={isActive} 
                  onCheckedChange={() => handleToggle(type.id)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save Home Type Settings"}
      </Button>
    </div>
  );
}