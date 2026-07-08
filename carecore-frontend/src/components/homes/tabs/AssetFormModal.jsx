import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORG_ID } from "@/lib/roleConfig";

const CATEGORIES = ["furniture", "equipment", "electronics", "safety", "kitchen", "cleaning", "other"];
const CONDITIONS = ["excellent", "good", "fair", "poor"];
const STATUSES = ["active", "under_warranty", "needs_repair", "out_of_service"];

export default function AssetFormModal({ open, onClose, asset, homeId, homeName }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  // Fetch homes and org profile
  const { data: homes = [] } = useQuery({
    queryKey: ["homes-for-assets"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID }),
  });

  const { data: orgProfile } = useQuery({
    queryKey: ["org-profile"],
    queryFn: () => base44.entities.OrganisationProfile.filter({}).then(r => r[0]),
  });

  const generateSerialNumber = (selectedHomeId) => {
    if (!selectedHomeId || !orgProfile) return "";
    const company = orgProfile.provider_legal_name || "UNKNOWN";
    const companyAbbr = company.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
    const selectedHome = homes.find(h => h.id === selectedHomeId);
    const homeAbbr = selectedHome?.name?.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase() || "UNK";
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${companyAbbr}-${homeAbbr}-${randomNum}`;
  };

  const [formData, setFormData] = useState({
    asset_name: "",
    home_id: homeId,
    category: "other",
    serial_number: "",
    location_in_home: "",
    purchase_date: "",
    warranty_expiry: "",
    purchase_cost: "",
    condition: "good",
    status: "active",
    notes: "",
    photo_url: "",
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        asset_name: asset.asset_name || "",
        home_id: asset.home_id || homeId,
        category: asset.category || "other",
        serial_number: asset.serial_number || "",
        location_in_home: asset.location_in_home || "",
        purchase_date: asset.purchase_date || "",
        warranty_expiry: asset.warranty_expiry || "",
        purchase_cost: asset.purchase_cost?.toString() || "",
        condition: asset.condition || "good",
        status: asset.status || "active",
        notes: asset.notes || "",
        photo_url: asset.photo_url || "",
      });
    } else {
      setFormData({
        asset_name: "",
        home_id: homeId,
        category: "other",
        serial_number: "",
        location_in_home: "",
        purchase_date: "",
        warranty_expiry: "",
        purchase_cost: "",
        condition: "good",
        status: "active",
        notes: "",
        photo_url: "",
      });
    }
  }, [asset, homeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleHomeChange = (e) => {
    const newHomeId = e.target.value;
    const selectedHome = homes.find(h => h.id === newHomeId);
    setFormData(p => ({
      ...p,
      home_id: newHomeId,
      serial_number: generateSerialNumber(newHomeId),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const selectedHome = homes.find(h => h.id === formData.home_id);
      const payload = {
        home_id: formData.home_id,
        home_name: selectedHome?.name || homeName,
        asset_name: formData.asset_name,
        category: formData.category,
        serial_number: formData.serial_number || null,
        location_in_home: formData.location_in_home || null,
        purchase_date: formData.purchase_date || null,
        warranty_expiry: formData.warranty_expiry || null,
        purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        condition: formData.condition,
        status: formData.status,
        notes: formData.notes || null,
        photo_url: formData.photo_url || null,
      };

      if (asset?.id) {
        await base44.entities.HomeAsset.update(asset.id, payload);
      } else {
        await base44.entities.HomeAsset.create(payload);
      }

      queryClient.invalidateQueries({ queryKey: ["home-assets"] });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold">{asset ? "Edit Asset" : "Add New Asset"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Home Assignment */}
          <div>
            <label className="block text-sm font-semibold mb-2">Assign to Home *</label>
            <select
              name="home_id"
              value={formData.home_id}
              onChange={handleHomeChange}
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
            >
              {homes.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          {/* Asset Name */}
          <div>
            <label className="block text-sm font-semibold mb-2">Asset name *</label>
            <input
              type="text"
              name="asset_name"
              value={formData.asset_name}
              onChange={handleChange}
              placeholder="e.g. Double Bed - Bedroom 1"
              required
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Two columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold mb-2">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-semibold mb-2">Condition</label>
              <select name="condition" value={formData.condition} onChange={handleChange} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Serial Number & Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Serial number (auto-generated)</label>
              <input type="text" name="serial_number" value={formData.serial_number} onChange={handleChange} placeholder="Auto-generated on home selection" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              <p className="text-xs text-muted-foreground mt-1">Format: CompanyAbbr-HomeAbbr-RandomNo</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Location in home</label>
              <input type="text" name="location_in_home" value={formData.location_in_home} onChange={handleChange} placeholder="e.g. Ground Floor - Kitchen" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Purchase date</label>
              <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Warranty expiry</label>
              <input type="date" name="warranty_expiry" value={formData.warranty_expiry} onChange={handleChange} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>

          {/* Cost & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Purchase cost £</label>
              <input type="number" name="purchase_cost" value={formData.purchase_cost} onChange={handleChange} step="0.01" min="0" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ").charAt(0).toUpperCase() + s.replace(/_/g, " ").slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-2">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted">
              Cancel
            </button>
            <Button type="submit" disabled={loading} className="flex items-center gap-2">
              {loading ? "Saving..." : asset ? "Update Asset" : "Save Asset"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}