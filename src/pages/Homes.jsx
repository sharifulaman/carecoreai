import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Building2, Users, Shield, MapPin, Phone, ChevronRight, Plus, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddHomeModal from "@/components/homes/AddHomeModal";

const RISK_COLORS = {
  low: "bg-green-500/10 text-green-600",
  medium: "bg-amber-500/10 text-amber-600",
  high: "bg-red-500/10 text-red-600",
  critical: "bg-red-700/10 text-red-700",
};

const PROPERTY_TYPE_LABELS = {
  outreach: "Outreach",
  "24_hours": "24 Hours Housing",
  care: "Care Services",
  "18_plus": "18+ Accommodation",
};

export default function Homes() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterPropertyType, setFilterPropertyType] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const role = user?.role === "user" ? "support_worker" : (user?.role || "support_worker");

  const { data: allHomes = [] } = useQuery({
    queryKey: ["homes-all"],
    queryFn: () => secureGateway.filter("Home"),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents"],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
  });

  // Role-based filtering
  const myProfile = staff.find(s => s.email === user?.email);

  const homes = allHomes.filter(home => {
    if (role === "admin" || role === "admin_officer") return true;
    if (role === "team_leader") {
      return (home.team_leader_ids || []).includes(myProfile?.id) || home.team_leader_id === myProfile?.id;
    }
    if (role === "support_worker") {
      return (myProfile?.home_ids || []).includes(home.id);
    }
    return false;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Homes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {homes.length} home{homes.length !== 1 ? "s" : ""} · {role.replace(/_/g, " ")} view
          </p>
        </div>
        {(role === "admin" || role === "admin_officer") && (
          <Button className="gap-2 rounded-xl" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Home
          </Button>
        )}
      </div>

      {/* Property Type Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterPropertyType} onValueChange={setFilterPropertyType}>
          <SelectTrigger className="w-48 rounded-lg">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Property Types</SelectItem>
            <SelectItem value="outreach">Outreach</SelectItem>
            <SelectItem value="24_hours">24 Hours Housing</SelectItem>
            <SelectItem value="care">Care Services</SelectItem>
            <SelectItem value="18_plus">18+ Accommodation</SelectItem>
          </SelectContent>
        </Select>
        {filterPropertyType !== "all" && (
          <button 
            onClick={() => setFilterPropertyType("all")}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {homes.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No homes assigned to you yet.</p>
        </div>
      ) : (
        <>
          {(() => {
            const filteredHomes = homes.filter(h => {
              if (filterPropertyType === "all") return true;
              return h.property_type === filterPropertyType;
            });
            
            return filteredHomes.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No homes found for {PROPERTY_TYPE_LABELS[filterPropertyType]}.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredHomes.map(home => {
            const homeResidents = residents.filter(r => r.home_id === home.id);
            const riskFlags = homeResidents.filter(r => r.risk_level === "high" || r.risk_level === "critical");
            const tl = staff.find(s => s.id === home.team_leader_id);

            return (
              <button
                key={home.id}
                onClick={() => navigate(`/homes/${home.id}`)}
                className="text-left bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{home.name}</h3>
                      <span className="text-xs text-muted-foreground capitalize">{home.property_type?.replace(/_/g, " ") || home.type?.replace(/_/g, " ") || "Home"}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  {home.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{home.address}{home.postcode ? `, ${home.postcode}` : ""}</span>
                    </div>
                  )}
                  {home.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{home.phone}</span>
                    </div>
                  )}
                  {tl && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>TL: {tl.full_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-lg font-medium">
                    <Users className="w-3 h-3" />
                    {homeResidents.length} resident{homeResidents.length !== 1 ? "s" : ""}
                  </span>
                  {riskFlags.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-600 text-xs px-2 py-1 rounded-lg font-medium">
                      <Shield className="w-3 h-3" />
                      {riskFlags.length} risk flag{riskFlags.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className={`ml-auto text-xs px-2 py-1 rounded-lg font-medium capitalize ${
                    home.status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                  }`}>
                    {home.status || "active"}
                  </span>
                </div>
              </button>
            );
          })}
              </div>
            );
          })()}
        </>
      )}

      {showAddModal && (
        <AddHomeModal
          staffProfiles={staff}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ["homes-all"] });
          }}
        />
      )}
    </div>
  );
}