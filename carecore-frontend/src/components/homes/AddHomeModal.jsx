import { useState } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axiosInstance from "@/api/axiosInstance";
import { base44 } from "@/api/base44Client";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger"; // Custom hook for triggering workflows

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

const getDocumentCategory = (type) => {
  if (["gas_safety", "electric_cert", "eicr", "fire_risk"].includes(type)) return "Compliance";
  if (type === "planning") return "Plans";
  if (["ofsted_report", "cqc_report"].includes(type)) return "Reports";
  if (type === "policy") return "Policies";
  if (type === "insurance") return "Important Documents";
  return "Other";
};

export default function AddHomeModal({ staffProfiles = [], onClose, onSuccess, user }) {
  const [loading, setLoading] = useState(false);
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile: user }); // Custom hook for triggering workflows
  const [errors, setErrors] = useState({});
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

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validateForm = () => {
    const errs = {};
    
    if (!formData.name?.trim()) {
      errs.name = "Home name is required";
    } else if (formData.name.trim().length < 3) {
      errs.name = "Home name must be at least 3 characters";
    }

    if (!formData.address?.trim()) {
      errs.address = "Address is required";
    } else if (formData.address.trim().length < 5) {
      errs.address = "Address must be at least 5 characters";
    }

    if (!formData.postcode?.trim()) {
      errs.postcode = "Postcode is required";
    } else if (!/^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i.test(formData.postcode)) {
      errs.postcode = "Please enter a valid UK postcode";
    }

    if (!formData.phone?.trim()) {
      errs.phone = "Phone number is required";
    } else if (!/^[0-9+\s()-]{7,20}$/.test(formData.phone)) {
      errs.phone = "Please enter a valid phone number";
    }

    if (!formData.email?.trim()) {
      errs.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Invalid email address";
    }

    if (!formData.team_leader_id) {
      errs.team_leader_id = "Please select a team leader";
    }

    if (!formData.monthly_rent) {
      errs.monthly_rent = "Monthly rent is required";
    } else if (isNaN(Number(formData.monthly_rent)) || Number(formData.monthly_rent) < 0) {
      errs.monthly_rent = "Please enter a valid positive amount";
    }

    if (!formData.landlord_name?.trim()) {
      errs.landlord_name = "Landlord name is required";
    } else if (formData.landlord_name.trim().length < 3) {
      errs.landlord_name = "Landlord name must be at least 3 characters";
    }

    if (!formData.landlord_contact?.trim()) {
      errs.landlord_contact = "Landlord phone is required";
    } else if (!/^[0-9+\s()-]{7,20}$/.test(formData.landlord_contact)) {
      errs.landlord_contact = "Please enter a valid phone number";
    }

    if (!formData.landlord_email?.trim()) {
      errs.landlord_email = "Landlord email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.landlord_email)) {
      errs.landlord_email = "Invalid landlord email";
    }

    if (!formData.lease_start) {
      errs.lease_start = "Lease start date is required";
    }
    
    if (!formData.lease_end) {
      errs.lease_end = "Lease end date is required";
    } else if (formData.lease_start && new Date(formData.lease_end) < new Date(formData.lease_start)) {
      errs.lease_end = "Lease end must be after lease start";
    }

    const docErrors = [];
    documents.forEach((doc, idx) => {
      const docErr = {};
      if (!doc.file) docErr.file = "Please choose a file";
      if (!doc.reference?.trim()) docErr.reference = "Reference is required";
      if (Object.keys(docErr).length > 0) {
        docErrors[idx] = docErr;
      }
    });
    if (docErrors.filter(Boolean).length > 0) {
      errs.documents = docErrors;
    }

    return errs;
  };

  const [documents, setDocuments] = useState([]);

  const toIsoDateTime = (dateValue) => {
    if (!dateValue) return undefined;
    return new Date(`${dateValue}T00:00:00Z`).toISOString();
  };

  const getDocumentFolder = () => `home/documents/${formData.name || "home"}`;

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
    if (errors.documents?.[index]?.[field]) {
      setErrors(prev => {
        const newDocs = [...(prev.documents || [])];
        if (newDocs[index]) {
          const updatedDoc = { ...newDocs[index] };
          delete updatedDoc[field];
          if (Object.keys(updatedDoc).length === 0) {
            newDocs[index] = undefined;
          } else {
            newDocs[index] = updatedDoc;
          }
        }
        if (newDocs.every(d => !d)) {
          return { ...prev, documents: undefined };
        }
        return { ...prev, documents: newDocs };
      });
    }
  };

  const handleFileChange = (index, file) => {
    const updated = [...documents];
    updated[index].file = file;
    setDocuments(updated);
    if (errors.documents?.[index]?.file) {
      setErrors(prev => {
        const newDocs = [...(prev.documents || [])];
        if (newDocs[index]) {
          const updatedDoc = { ...newDocs[index] };
          delete updatedDoc.file;
          if (Object.keys(updatedDoc).length === 0) {
            newDocs[index] = undefined;
          } else {
            newDocs[index] = updatedDoc;
          }
        }
        if (newDocs.every(d => !d)) {
          return { ...prev, documents: undefined };
        }
        return { ...prev, documents: newDocs };
      });
    }
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setLoading(true);

  //   try {
  //     // Create home
  //     const homeData = {
  //       org_id: "default_org",
  //       name: formData.name,
  //       type: formData.type,
  //       address: formData.address || undefined,
  //       postcode: formData.postcode || undefined,
  //       phone: formData.phone || undefined,
  //       email: formData.email || undefined,
  //       team_leader_id: formData.team_leader_id,
  //       monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : undefined,
  //       landlord_name: formData.landlord_name || undefined,
  //       landlord_contact: formData.landlord_contact || undefined,
  //       landlord_email: formData.landlord_email || undefined,
  //       lease_start: formData.lease_start || undefined,
  //       lease_end: formData.lease_end || undefined,
  //       property_notes: formData.property_notes || undefined,
  //       document_ids: []
  //     };


  //     const home = await base44.functions.invoke("createHome", homeData);
  //     const homeId = home.data.id;

  //     // Upload documents
  //     const docIds = [];
  //     for (const doc of documents) {
  //       if (!doc.file) continue;

  //       const fileFormData = new FormData();
  //       fileFormData.append("file", doc.file);
  //       fileFormData.append("home_id", homeId);
  //       fileFormData.append("document_type", doc.type);
  //       fileFormData.append("title", `${doc.type} - ${doc.reference || doc.file.name}`);
  //       fileFormData.append("reference", doc.reference);
  //       fileFormData.append("details", doc.details);
  //       fileFormData.append("expiry_date", doc.expiry_date);

  //       const docRes = await base44.functions.invoke("uploadHomeDocument", {
  //         home_id: homeId,
  //         document_type: doc.type,
  //         title: `${doc.type} - ${doc.reference || doc.file.name}`,
  //         file_name: doc.file.name,
  //         reference: doc.reference,
  //         details: doc.details,
  //         expiry_date: doc.expiry_date
  //       });
  //       if (docRes.data.id) docIds.push(docRes.data.id);
  //     }

  //     // Update home with document IDs
  //     if (docIds.length > 0) {
  //       await base44.functions.invoke("updateHome", {
  //         id: homeId,
  //         document_ids: docIds
  //       });
  //     }

  //     onSuccess?.();
  //   } catch (error) {
  //     console.error("Error creating home:", error);
  //     alert("Failed to create home. Please try again.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);

    try {
      const uploadedDocuments = [];
      for (const doc of documents) {
        let uploaded = null;
        if (doc.file) {
          uploaded = await base44.integrations.Core.UploadFile({
            file: doc.file,
            folder: `home/home_documents/${formData.name || "home"}`,
          });
        }

        uploadedDocuments.push({
          document_type: doc.type,
          doc_type: doc.type,
          category: getDocumentCategory(doc.type),
          doc_category: getDocumentCategory(doc.type),
          title: doc.reference || doc.file?.name || doc.type,
          reference: doc.reference || undefined,
          details: doc.details || undefined,
          file_name: uploaded?.original_name || doc.file?.name || undefined,
          file_url: uploaded?.file_url || undefined,
          key: uploaded?.key || undefined,
          file_size: uploaded?.size || doc.file?.size || undefined,
          content_type: uploaded?.content_type || doc.file?.type || undefined,
          expiry_date: doc.expiry_date || undefined,
          created_by: user?.id || undefined,
          created_by_name: user ? (user.full_name || user.name || user.email) : "System",
          uploaded_by: user?.id || undefined,
          uploaded_by_name: user ? (user.full_name || user.name || user.email) : "System",
        });
      }

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
        lease_start: toIsoDateTime(formData.lease_start),
        lease_end: toIsoDateTime(formData.lease_end),
        property_notes: formData.property_notes || undefined,
        documents: uploadedDocuments
      };

      const response = await axiosInstance.post("/entities/Home", homeData);
      const createdHome = response?.data?.data || response?.data;
      console.log("Response: ", response.data);

      triggerWorkflow({
        workflowType: "home_creation",
        entityId: createdHome?.id,
        entityRef: createdHome?.id ? `HOM-${createdHome.id.slice(0, 8)}` : "",
        title: `New Home — ${formData.name}`,
        description: `${formData.type?.replace(/_/g, " ")} home created at ${formData.address || "unspecified address"}.`,
        homeId: createdHome?.id,
        homeName: formData.name,
        priority: "routine",
      });

      onSuccess?.(createdHome);
      // close modal after successful creation
      onClose?.();
    } catch (error) {
      console.error("Error creating home:", error);
      const apiMessage = error?.response?.data?.error?.message || error?.response?.data?.error || error?.message;
      alert(apiMessage ? `Failed to create home: ${apiMessage}` : "Failed to create home. Please try again.");
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

        <form id="add-home-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Property Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Home Name *"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <Select value={formData.type} onValueChange={(value) => updateField("type", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outreach">Outreach</SelectItem>
                  <SelectItem value="24_hours">24 Hours Housing</SelectItem>
                  {/* <SelectItem value="care">Care Services</SelectItem> */}
                  <SelectItem value="18_plus">18+ Accommodation</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <Input
                  placeholder="Address *"
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className={errors.address ? "border-destructive" : ""}
                />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address}</p>}
              </div>
              <div>
                <Input
                  placeholder="Postcode *"
                  value={formData.postcode}
                  onChange={(e) => updateField("postcode", e.target.value.toUpperCase())}
                  className={errors.postcode ? "border-destructive" : ""}
                />
                {errors.postcode && <p className="text-xs text-destructive mt-1">{errors.postcode}</p>}
              </div>
              <div>
                <Input
                  placeholder="Phone *"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={errors.phone ? "border-destructive" : ""}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div>
                <Input
                  placeholder="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div>
                <Select value={formData.team_leader_id} onValueChange={(value) => updateField("team_leader_id", value)}>
                  <SelectTrigger className={errors.team_leader_id ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select Team Leader *" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffProfiles.filter(s => s.role === "team_leader").map(tl => (
                      <SelectItem key={tl.id} value={tl.id}>{tl.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.team_leader_id && <p className="text-xs text-destructive mt-1">{errors.team_leader_id}</p>}
              </div>
              <div>
                <Input
                  placeholder="Monthly Rent (£) *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_rent}
                  onChange={(e) => updateField("monthly_rent", e.target.value)}
                  className={errors.monthly_rent ? "border-destructive" : ""}
                />
                {errors.monthly_rent && <p className="text-xs text-destructive mt-1">{errors.monthly_rent}</p>}
              </div>
            </div>
          </div>

          {/* Landlord Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Landlord Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="Landlord Name *"
                  value={formData.landlord_name}
                  onChange={(e) => updateField("landlord_name", e.target.value)}
                  className={errors.landlord_name ? "border-destructive" : ""}
                />
                {errors.landlord_name && <p className="text-xs text-destructive mt-1">{errors.landlord_name}</p>}
              </div>
              <div>
                <Input
                  placeholder="Landlord Phone *"
                  value={formData.landlord_contact}
                  onChange={(e) => updateField("landlord_contact", e.target.value)}
                  className={errors.landlord_contact ? "border-destructive" : ""}
                />
                {errors.landlord_contact && <p className="text-xs text-destructive mt-1">{errors.landlord_contact}</p>}
              </div>
              <div>
                <Input
                  placeholder="Landlord Email *"
                  type="email"
                  value={formData.landlord_email}
                  onChange={(e) => updateField("landlord_email", e.target.value)}
                  className={errors.landlord_email ? "border-destructive" : ""}
                />
                {errors.landlord_email && <p className="text-xs text-destructive mt-1">{errors.landlord_email}</p>}
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Lease Period</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <Input
                      type="date"
                      value={formData.lease_start}
                      onChange={(e) => updateField("lease_start", e.target.value)}
                      className={errors.lease_start ? "border-destructive" : ""}
                    />
                    {errors.lease_start && <p className="text-xs text-destructive mt-1">{errors.lease_start}</p>}
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={formData.lease_end}
                      onChange={(e) => updateField("lease_end", e.target.value)}
                      min={formData.lease_start || undefined}
                      className={errors.lease_end ? "border-destructive" : ""}
                    />
                    {errors.lease_end && <p className="text-xs text-destructive mt-1">{errors.lease_end}</p>}
                  </div>
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
                  <div>
                    <Input
                      placeholder="Reference (e.g., Gas Safe ID) *"
                      value={doc.reference}
                      onChange={(e) => handleDocumentChange(idx, "reference", e.target.value)}
                      className={errors.documents?.[idx]?.reference ? "border-destructive" : ""}
                    />
                    {errors.documents?.[idx]?.reference && <p className="text-xs text-destructive mt-1">{errors.documents[idx].reference}</p>}
                  </div>
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
                  <div className="flex-1">
                    <label className={`block px-3 py-2 border rounded-lg text-xs cursor-pointer hover:bg-muted transition-colors ${errors.documents?.[idx]?.file ? "border-destructive" : "border-border"}`}>
                      {doc.file ? `✓ ${doc.file.name}` : "Choose file... *"}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange(idx, e.target.files?.[0])}
                      />
                    </label>
                    {errors.documents?.[idx]?.file && <p className="text-xs text-destructive mt-1">{errors.documents[idx].file}</p>}
                  </div>
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
          <Button type="submit" form="add-home-form" disabled={loading}>
            {loading ? "Creating..." : "Create Home"}
          </Button>
        </div>
      </div>
    </div>
  );
}
