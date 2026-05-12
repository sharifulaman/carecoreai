import { useState } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const DOCUMENT_TYPES = [
  "gas_safety",
  "electric_cert",
  "eicr",
  "fire_risk",
  "insurance",
  "lease",
  "planning",
  "ofsted_report",
  "cqc_report",
  "policy",
  "other"
];

export default function AddHomeModal({ staffProfiles, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "outreach",
    address: "",
    postcode: "",
    phone: "",
    email: "",
    team_leader_id: "",
    monthly_rent: "",
    landlord_name: "",
    landlord_contact: "",
    landlord_email: "",
    lease_start: "",
    lease_end: "",
    property_notes: ""
  });

  const [documents, setDocuments] = useState([]);

  const handleAddDocument = () => {
    setDocuments([
      ...documents,
      { file: null, type: "other", reference: "", details: "", expiry_date: "" }
    ]);
  };

  const handleRemoveDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleDocumentChange = (index, field, value) => {
    const updated = [...documents];
    updated[index][field] = value;
    setDocuments(updated);
  };

  const handleFileChange = (index, file) => {
    const updated = [...documents];
    updated[index].file = file;
    setDocuments(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create home
      const homeData = {
        org_id: "default_org",
        name: formData.name,
        type: formData.type,
        address: formData.address || undefined,
        postcode: formData.postcode || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        team_leader_id: formData.team_leader_id,
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : undefined,
        landlord_name: formData.landlord_name || undefined,
        landlord_contact: formData.landlord_contact || undefined,
        landlord_email: formData.landlord_email || undefined,
        lease_start: formData.lease_start || undefined,
        lease_end: formData.lease_end || undefined,
        property_notes: formData.property_notes || undefined,
        document_ids: []
      };

      const home = await base44.functions.invoke("createHome", homeData);
      const homeId = home.data.id;

      // Upload documents
      const docIds = [];
      for (const doc of documents) {
        if (!doc.file) continue;

        const fileFormData = new FormData();
        fileFormData.append("file", doc.file);
        fileFormData.append("home_id", homeId);
        fileFormData.append("document_type", doc.type);
        fileFormData.append("title", `${doc.type} - ${doc.reference || doc.file.name}`);
        fileFormData.append("reference", doc.reference);
        fileFormData.append("details", doc.details);
        fileFormData.append("expiry_date", doc.expiry_date);

        const docRes = await base44.functions.invoke("uploadHomeDocument", {
          home_id: homeId,
          document_type: doc.type,
          title: `${doc.type} - ${doc.reference || doc.file.name}`,
          file_name: doc.file.name,
          reference: doc.reference,
          details: doc.details,
          expiry_date: doc.expiry_date
        });
        if (docRes.data.id) docIds.push(docRes.data.id);
      }

      // Update home with document IDs
      if (docIds.length > 0) {
        await base44.functions.invoke("updateHome", {
          id: homeId,
          document_ids: docIds
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating home:", error);
      alert("Failed to create home. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold">Add New Home</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Property Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Home Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outreach">Outreach</SelectItem>
                  <SelectItem value="24_hours">24 Hours Housing</SelectItem>
                  <SelectItem value="care">Care Services</SelectItem>
                  <SelectItem value="18_plus">18+ Accommodation</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <Input
                placeholder="Postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Select value={formData.team_leader_id} onValueChange={(value) => setFormData({ ...formData, team_leader_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Team Leader" />
                </SelectTrigger>
                <SelectContent>
                  {staffProfiles.filter(s => s.role === "team_leader").map(tl => (
                    <SelectItem key={tl.id} value={tl.id}>{tl.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Monthly Rent (£)"
                type="number"
                step="0.01"
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
              />
            </div>
          </div>

          {/* Landlord Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Landlord Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Landlord Name"
                value={formData.landlord_name}
                onChange={(e) => setFormData({ ...formData, landlord_name: e.target.value })}
              />
              <Input
                placeholder="Landlord Phone"
                value={formData.landlord_contact}
                onChange={(e) => setFormData({ ...formData, landlord_contact: e.target.value })}
              />
              <Input
                placeholder="Landlord Email"
                type="email"
                value={formData.landlord_email}
                onChange={(e) => setFormData({ ...formData, landlord_email: e.target.value })}
              />
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Lease Period</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    type="date"
                    value={formData.lease_start}
                    onChange={(e) => setFormData({ ...formData, lease_start: e.target.value })}
                  />
                  <Input
                    type="date"
                    value={formData.lease_end}
                    onChange={(e) => setFormData({ ...formData, lease_end: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Documents</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddDocument} className="gap-2">
                <Upload className="w-3 h-3" /> Add Document
              </Button>
            </div>
            {documents.map((doc, idx) => (
              <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Select value={doc.type} onValueChange={(value) => handleDocumentChange(idx, "type", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Reference (e.g., Gas Safe ID)"
                    value={doc.reference}
                    onChange={(e) => handleDocumentChange(idx, "reference", e.target.value)}
                  />
                  <Input
                    placeholder="Details/Notes"
                    value={doc.details}
                    onChange={(e) => handleDocumentChange(idx, "details", e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="Expiry Date"
                    value={doc.expiry_date}
                    onChange={(e) => handleDocumentChange(idx, "expiry_date", e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1 px-3 py-2 border border-border rounded-lg text-xs cursor-pointer hover:bg-muted transition-colors">
                    {doc.file ? `✓ ${doc.file.name}` : "Choose file..."}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileChange(idx, e.target.files?.[0])}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveDocument(idx)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Additional Notes</label>
            <textarea
              className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm resize-none"
              rows="3"
              placeholder="Any notes about the property..."
              value={formData.property_notes}
              onChange={(e) => setFormData({ ...formData, property_notes: e.target.value })}
            />
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.name || !formData.team_leader_id}>
            {loading ? "Creating..." : "Create Home"}
          </Button>
        </div>
      </div>
    </div>
  );
}