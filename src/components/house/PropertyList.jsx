import { Building2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  active: "bg-green-500/10 text-green-500",
  archived: "bg-muted text-muted-foreground",
};

const TYPE_LABELS = {
  outreach: "Outreach",
  "24_hours": "24 Hours Housing",
  care: "Care Services",
  "18_plus": "18+ Accommodation",
};

const CARE_MODEL_LABELS = {
  residential: "Residential",
  outreach: "Outreach",
  both: "Residential & Outreach",
};

export default function PropertyList({ properties, canEdit, onDelete }) {
  if (properties.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No homes / properties added yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {properties.map(p => (
        <div key={p.id} className="bg-card rounded-xl border border-border p-4 md:p-5 hover:shadow-md transition-all">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="w-4 md:w-5 h-4 md:h-5 text-primary shrink-0" />
              <p className="font-semibold text-sm md:text-base truncate">{p.name}</p>
            </div>
            <Badge className={cn("text-xs capitalize shrink-0", STATUS_COLORS[p.status] || STATUS_COLORS.active)}>{p.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.address}{p.postcode ? `, ${p.postcode}` : ""}</p>
          <div className="text-xs space-y-1 text-muted-foreground">
            {p.type && <p><span className="font-medium text-foreground">Home Type:</span> {TYPE_LABELS[p.type] || p.type}</p>}
            {p.care_model && <p><span className="font-medium text-foreground">Care Model:</span> {CARE_MODEL_LABELS[p.care_model] || p.care_model}</p>}
            {p.compliance_framework && <p><span className="font-medium text-foreground">Compliance:</span> {p.compliance_framework.toUpperCase()}</p>}
            {p.phone && <p className="line-clamp-1"><span className="font-medium text-foreground">Phone:</span> {p.phone}</p>}
            {p.email && <p className="line-clamp-1"><span className="font-medium text-foreground">Email:</span> {p.email}</p>}
          </div>
          {onDelete && canEdit && (
            <div className="pt-3 mt-3 border-t border-border flex justify-end">
              <button onClick={() => onDelete(p.id)} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}