import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getSetting, saveSettings, clearSettingsCache } from "@/lib/orgSettings";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";

const UK_TIMEZONES = [
  "Europe/London",
  "Europe/Belfast",
];

export default function OrganisationTab({ staffProfile }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [orgRecord, setOrgRecord] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const isAdmin = staffProfile?.role === "admin";

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Fetch the actual Organisation record first (for top-level entity fields)
      const orgs = await secureGateway.filter("Organisation");
      const org = orgs?.[0] || null;
      setOrgRecord(org);

      // Merge top-level entity fields with settings blob, entity fields take priority
      const settings = org?.settings || {};

      setFormData({
        org_name: org?.name || settings.org_name || "Default Organisation",
        app_name: org?.app_name || settings.app_name || "CareCore AI",
        logo_url: org?.logo_url || settings.logo_url || "",
        primary_colour: org?.primary_colour || settings.primary_colour || "#4B8BF5",
        secondary_colour: settings.secondary_colour || "#1D9E75",
        default_theme: org?.default_theme || settings.default_theme || "light",
        contact_email: org?.contact_email || settings.contact_email || "",
        contact_phone: settings.contact_phone || "",
        website: settings.website || "",
        registered_address: settings.registered_address || "",
        company_number: settings.company_number || "",
        ofsted_number: settings.ofsted_number || "",
        cqc_number: settings.cqc_number || "",
        default_language: org?.default_language || settings.default_language || "English",
        timezone: settings.timezone || "Europe/London",
        date_format: settings.date_format || "DD/MM/YYYY",
        currency_symbol: settings.currency_symbol || "£",
        currency_code: settings.currency_code || "GBP",
        regulatory_frameworks: settings.regulatory_frameworks || [],
        la_contract_ref: settings.la_contract_ref || "",
        inspection_body_contact: settings.inspection_body_contact || "",
        paye_reference: org?.paye_reference || settings.paye_reference || "",
        accounts_office_ref: org?.accounts_office_ref || settings.accounts_office_ref || "",
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    try {
      setSaving(true);
      let logoUrl = formData.logo_url;

      if (logoFile) {
        const uploaded = await base44.integrations.Core.UploadFile({ file: logoFile });
        logoUrl = uploaded.file_url;
      }

      const toSave = { ...formData, logo_url: logoUrl };

      // Save all fields into the settings blob (existing mechanism)
      await saveSettings(toSave);
      clearSettingsCache();

      // Also persist top-level Organisation entity fields directly
      if (orgRecord?.id) {
        await secureGateway.update("Organisation", orgRecord.id, {
          name: formData.org_name,
          app_name: formData.app_name,
          logo_url: logoUrl,
          primary_colour: formData.primary_colour,
          default_theme: formData.default_theme,
          contact_email: formData.contact_email,
          default_language: formData.default_language,
          paye_reference: formData.paye_reference,
          accounts_office_ref: formData.accounts_office_ref,
        });
      }

      setLogoFile(null);

      // Apply primary colour to CSS immediately
      if (formData.primary_colour) {
        const hex = formData.primary_colour;
        // Convert hex to HSL for the CSS variable
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
        document.documentElement.style.setProperty("--primary", hsl);
        document.documentElement.style.setProperty("--ring", hsl);
      }

      toast.success("Organisation settings saved");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Branding Section */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Branding</h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Organisation Name</Label>
            <Input 
              value={formData.org_name || ""} 
              onChange={(e) => setFormData({...formData, org_name: e.target.value})}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>App Name</Label>
            <Input 
              value={formData.app_name || ""} 
              onChange={(e) => setFormData({...formData, app_name: e.target.value})}
              className="mt-1.5"
              placeholder="CareCore AI"
            />
          </div>
        </div>

        <div>
          <Label>Organisation Logo</Label>
          <div className="mt-1.5 flex items-center gap-4">
            {formData.logo_url && (
              <img src={formData.logo_url} alt="Logo" className="h-12 w-auto rounded-lg border border-border" />
            )}
            <div className="flex-1">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                className="block w-full text-sm"
              />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Primary Colour</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <Input 
                type="color" 
                value={formData.primary_colour || "#4B8BF5"} 
                onChange={(e) => setFormData({...formData, primary_colour: e.target.value})}
                className="h-10 w-20"
              />
              <Input 
                type="text"
                value={formData.primary_colour || "#4B8BF5"} 
                onChange={(e) => setFormData({...formData, primary_colour: e.target.value})}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <Label>Secondary Colour</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <Input 
                type="color" 
                value={formData.secondary_colour || "#1D9E75"} 
                onChange={(e) => setFormData({...formData, secondary_colour: e.target.value})}
                className="h-10 w-20"
              />
              <Input 
                type="text"
                value={formData.secondary_colour || "#1D9E75"} 
                onChange={(e) => setFormData({...formData, secondary_colour: e.target.value})}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div>
          <Label>Default Theme</Label>
          <Select value={formData.default_theme || "light"} onValueChange={(v) => setFormData({...formData, default_theme: v})}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Contact Email</Label>
            <Input 
              type="email"
              value={formData.contact_email || ""} 
              onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Contact Phone</Label>
            <Input 
              value={formData.contact_phone || ""} 
              onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label>Website</Label>
          <Input 
            type="url"
            value={formData.website || ""} 
            onChange={(e) => setFormData({...formData, website: e.target.value})}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Registered Address</Label>
          <Textarea 
            value={formData.registered_address || ""} 
            onChange={(e) => setFormData({...formData, registered_address: e.target.value})}
            className="mt-1.5"
            rows={3}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label>Company Number</Label>
            <Input 
              value={formData.company_number || ""} 
              onChange={(e) => setFormData({...formData, company_number: e.target.value})}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Ofsted Registration</Label>
            <Input 
              value={formData.ofsted_number || ""} 
              onChange={(e) => setFormData({...formData, ofsted_number: e.target.value})}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>CQC Registration</Label>
            <Input 
              value={formData.cqc_number || ""} 
              onChange={(e) => setFormData({...formData, cqc_number: e.target.value})}
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      {/* Localisation Section */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Localisation</h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Default Language</Label>
            <Select value={formData.default_language || "English"} onValueChange={(v) => setFormData({...formData, default_language: v})}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Welsh">Welsh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default Timezone</Label>
            <Select value={formData.timezone || "Europe/London"} onValueChange={(v) => setFormData({...formData, timezone: v})}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UK_TIMEZONES.map(tz => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Date Format</Label>
            <Select value={formData.date_format || "DD/MM/YYYY"} onValueChange={(v) => setFormData({...formData, date_format: v})}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Currency Code</Label>
            <Input 
              value={formData.currency_code || "GBP"} 
              onChange={(e) => setFormData({...formData, currency_code: e.target.value})}
              className="mt-1.5"
              maxLength={3}
            />
          </div>
        </div>

        <div>
          <Label>Currency Symbol</Label>
          <Input 
            value={formData.currency_symbol || "£"} 
            onChange={(e) => setFormData({...formData, currency_symbol: e.target.value})}
            className="mt-1.5"
            maxLength={2}
          />
        </div>
      </div>

      {/* HMRC / Payroll Section — admin only */}
      {isAdmin && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-semibold text-lg">HMRC Payroll (RTI)</h3>
          <p className="text-xs text-muted-foreground">Required for generating HMRC Real Time Information (RTI) submissions.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>HMRC PAYE Reference</Label>
              <Input
                value={formData.paye_reference || ""}
                onChange={(e) => setFormData({...formData, paye_reference: e.target.value})}
                className="mt-1.5"
                placeholder="123/AB456"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Found on your PAYE registration letter from HMRC</p>
            </div>
            <div>
              <Label>Accounts Office Reference</Label>
              <Input
                value={formData.accounts_office_ref || ""}
                onChange={(e) => setFormData({...formData, accounts_office_ref: e.target.value})}
                className="mt-1.5"
                placeholder="123PA00012345"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Found on the yellow payslip booklet from HMRC</p>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Registration Section */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-lg">Compliance Registration</h3>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>LA Contract Reference</Label>
            <Input 
              value={formData.la_contract_ref || ""} 
              onChange={(e) => setFormData({...formData, la_contract_ref: e.target.value})}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Inspection Body Contact</Label>
            <Input 
              value={formData.inspection_body_contact || ""} 
              onChange={(e) => setFormData({...formData, inspection_body_contact: e.target.value})}
              className="mt-1.5"
            />
          </div>
        </div>
      </div>

      {isAdmin && (
        <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? "Saving..." : "Save Organisation Settings"}
        </Button>
      )}
    </div>
  );
}