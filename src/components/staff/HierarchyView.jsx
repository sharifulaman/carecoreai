import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const roleColors = {
  team_leader: "bg-purple-500/10 text-purple-500",
  support_worker: "bg-blue-500/10 text-blue-500",
};

const roleLabels = {
  team_leader: "Team Leader",
  support_worker: "Support Worker",
};

export default function HierarchyView({ staff, homes }) {
  const [expandedTeamLeaders, setExpandedTeamLeaders] = useState(
    staff.filter(s => s.role === "team_leader").reduce((acc, tl) => ({ ...acc, [tl.id]: true }), {})
  );

  const toggleTeamLeader = (id) => {
    setExpandedTeamLeaders(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const teamLeaders = staff.filter(s => s.role === "team_leader" && s.status === "active");
  const supportWorkers = staff.filter(s => s.role === "support_worker" && s.status === "active");

  const getTeamLeaderHomes = (tlId) => {
    return homes.filter(h => h.team_leader_id === tlId && h.status === "active");
  };

  const getSupportWorkers = (tlId) => {
    return supportWorkers.filter(sw => sw.team_leader_id === tlId);
  };

  if (teamLeaders.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No team leaders found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teamLeaders.map(tl => {
        const assignedHomes = getTeamLeaderHomes(tl.id);
        const assignedWorkers = getSupportWorkers(tl.id);
        const isExpanded = expandedTeamLeaders[tl.id];

        return (
          <div key={tl.id} className="border border-border rounded-xl overflow-hidden">
            {/* Team Leader Header */}
            <button
              onClick={() => toggleTeamLeader(tl.id)}
              className="w-full bg-card hover:bg-muted/50 transition-colors p-4 flex items-center gap-3"
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-primary" />
              ) : (
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-sm">
                {tl.full_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-sm">{tl.full_name}</h3>
                <p className="text-xs text-muted-foreground">{tl.email || "No email"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {assignedHomes.length} home{assignedHomes.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {assignedWorkers.length} worker{assignedWorkers.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="bg-muted/30 border-t border-border p-4 space-y-4">
                {/* Homes Section */}
                {assignedHomes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Homes ({assignedHomes.length})</h4>
                    <div className="space-y-2">
                      {assignedHomes.map(home => (
                        <div key={home.id} className="bg-card rounded-lg p-3 border border-border/50">
                          <p className="text-sm font-medium">{home.name}</p>
                          <p className="text-xs text-muted-foreground">{home.address}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Support Workers Section */}
                {assignedWorkers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Support Workers ({assignedWorkers.length})</h4>
                    <div className="space-y-2">
                      {assignedWorkers.map(sw => (
                        <div key={sw.id} className="bg-card rounded-lg p-3 border border-border/50 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs">
                            {sw.full_name?.charAt(0) || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{sw.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{sw.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assignedHomes.length === 0 && assignedWorkers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No homes or support workers assigned</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}