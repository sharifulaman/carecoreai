import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, UserCheck, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels = { childrens: "Children's Home", supported: "Supported Accommodation", adult: "Adult Care" };
const modelLabels = { outreach: "Outreach", residential: "Residential", both: "Both Models" };

export default function HomeCard({ home, residentCount = 0, workerCount = 0, riskFlags = 0 }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all select-none">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{home.name}</h3>
            <p className="text-xs text-muted-foreground">{typeLabels[home.type] || home.type}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs capitalize">
          {modelLabels[home.care_model] || home.care_model}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{residentCount} Residents</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <UserCheck className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{workerCount} Workers</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield className={cn("w-4 h-4", riskFlags > 0 ? "text-amber-500" : "text-green-500")} />
          <span className={cn(riskFlags > 0 ? "text-amber-500" : "text-green-500")}>{riskFlags} Flags</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn("w-2 h-2 rounded-full", home.status === "active" ? "bg-green-500" : "bg-muted-foreground")} />
          <span className="text-xs text-muted-foreground capitalize">{home.status}</span>
        </div>
        <Link to={`/homes/${home.id}`} className="text-xs text-primary font-medium hover:underline">
          View Home →
        </Link>
      </div>
    </div>
  );
}