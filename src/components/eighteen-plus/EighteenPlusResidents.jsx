import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";
import ResidentExpandedView from "./ResidentExpandedView";
import TransferInModal from "./TransferInModal";
import MovedOnModal from "./MovedOnModal";

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function daysUntil(date) {
  if (!date) return null;
  return Math.ceil((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDaysInPlacement(days) {
  if (days < 90) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 365)}y${Math.floor((days % 365) / 30)}m`;
}

function getPlacementColor(days) {
  if (days < 90) return "text-slate-600 bg-slate-100";
  if (days < 365) return "text-blue-600 bg-blue-100";
  if (days < 730) return "text-green-600 bg-green-100";
  return "text-amber-600 bg-amber-100";
}

function getMoveOnStage(resident, pathwayPlans) {
  const plan = pathwayPlans.find(p => p.resident_id === resident.id);
  if (!plan) return { stage: 1, name: "Settling In" };
  const days = resident.placement_start ? Math.floor((Date.now() - new Date(resident.placement_start).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  if (days < 180) return { stage: 1, name: "Settling In" };
  if (days < 730) return { stage: 2, name: "Skills Building" };
  return { stage: 3, name: "Preparing to Move" };
}

export default function EighteenPlusResidents({ residents, homes, staff, pathwayPlans, ilsPlans, allowances, savings, user, onTransfer, onMovedOn }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterHome, setFilterHome] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterEET, setFilterEET] = useState("all");
  const [filterPathway, setFilterPathway] = useState("all");
  const [filterTurning21, setFilterTurning21] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMovedOnModal, setShowMovedOnModal] = useState(false);

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const filtered = useMemo(() => {
    return residents
      .filter(r => {
        if (search && !r.display_name?.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterHome !== "all" && r.home_id !== filterHome) return false;
        if (filterTurning21) {
          const daysTo21 = daysUntil(new Date(new Date(r.dob).getFullYear() + 21, new Date(r.dob).getMonth(), new Date(r.dob).getDate()));
          if (!daysTo21 || daysTo21 > 90) return false;
        }
        if (filterEET !== "all" && r.education_status !== filterEET) return false;
        if (filterPathway !== "all") {
          const plan = pathwayPlans.find(p => p.resident_id === r.id);
          if (filterPathway === "active" && (!plan || plan.status !== "active")) return false;
          if (filterPathway === "overdue" && (!plan || new Date(plan.review_date) > new Date())) return false;
          if (filterPathway === "missing" && plan) return false;
        }
        if (filterStage !== "all") {
          const stage = getMoveOnStage(r, pathwayPlans).stage;
          if (filterStage !== String(stage)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aDay = a.dob ? new Date(new Date(a.dob).getFullYear() + 21, new Date(a.dob).getMonth(), new Date(a.dob).getDate()) : new Date(9999, 0);
        const bDay = b.dob ? new Date(new Date(b.dob).getFullYear() + 21, new Date(b.dob).getMonth(), new Date(b.dob).getDate()) : new Date(9999, 0);
        return aDay - bDay;
      });
  }, [residents, search, filterHome, filterStage, filterEET, filterPathway, filterTurning21, pathwayPlans]);

  return (
    <div className="space-y-4">
      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-lg p-3">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-40"
        />
        <Select value={filterHome} onValueChange={setFilterHome}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Homes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="1">Stage 1: Settling In</SelectItem>
            <SelectItem value="2">Stage 2: Skills Building</SelectItem>
            <SelectItem value="3">Stage 3: Preparing to Move</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEET} onValueChange={setFilterEET}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All EET" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All EET Status</SelectItem>
            <SelectItem value="employed">Employed</SelectItem>
            <SelectItem value="enrolled_college">College</SelectItem>
            <SelectItem value="neet">NEET</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => setFilterTurning21(!filterTurning21)}
          className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
            filterTurning21 ? "bg-red-600 text-white border-red-600" : "border-border hover:bg-muted"
          }`}
        >
          🎂 Turning 21 Soon
        </button>
        <div className="flex-1" />
        <Button onClick={() => setShowTransferModal(true)} variant="outline" size="sm">
          Transfer In
        </Button>
        <Button onClick={() => setShowMovedOnModal(true)} variant="outline" size="sm">
          Mark Moved On
        </Button>
      </div>

      {/* TABLE */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-3 font-semibold text-xs">Resident</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">Time in Placement</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">Pathway Plan</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">Move-On Stage</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">PA</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">EET Status</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">Turning 21</th>
              <th className="text-left px-3 py-3 font-semibold text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No residents found.</td></tr>
            ) : filtered.map(resident => {
              const age = calcAge(resident.dob);
              const home = homeMap[resident.home_id];
              const daysInPlacement = resident.placement_start ? Math.floor((Date.now() - new Date(resident.placement_start).getTime()) / (1000 * 60 * 60 * 24)) : 0;
              const pathwayPlan = pathwayPlans.find(p => p.resident_id === resident.id);
              const stage = getMoveOnStage(resident, pathwayPlans);
              const daysTo21 = daysUntil(new Date(new Date(resident.dob).getFullYear() + 21, new Date(resident.dob).getMonth(), new Date(resident.dob).getDate()));
              const isExpanded = expandedId === resident.id;

              return (
                <div key={resident.id}>
                  <tr className="border-b border-border/50 last:border-0 hover:bg-muted/10 cursor-pointer">
                    <td className="px-3 py-3" onClick={() => setExpandedId(isExpanded ? null : resident.id)}>
                      <div>
                        <p className="font-medium">{resident.display_name || resident.initials}</p>
                        <p className="text-xs text-muted-foreground">{age}y • {home?.name}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPlacementColor(daysInPlacement)}`}>
                        {formatDaysInPlacement(daysInPlacement)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {!pathwayPlan ? (
                        <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 font-medium">Missing</span>
                      ) : new Date(pathwayPlan.review_date) < new Date() ? (
                        <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600 font-medium">Overdue</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-600 font-medium">Active</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-medium">{stage.name}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs">
                        <p className="font-medium">—</p>
                        <p className="text-muted-foreground">No visit</p>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        resident.education_status === "employed" ? "bg-green-500/10 text-green-600" :
                        resident.education_status === "neet" ? "bg-red-500/10 text-red-600" :
                        "bg-blue-500/10 text-blue-600"
                      }`}>
                        {resident.education_status?.replace(/_/g, " ") || "Unknown"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {daysTo21 && daysTo21 > 0 ? (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${daysTo21 <= 90 ? "bg-red-500/10 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                          {Math.floor(daysTo21 / 30)}m
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => setExpandedId(isExpanded ? null : resident.id)} className="text-primary text-xs font-medium">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-border/50">
                      <td colSpan={8} className="px-3 py-4 bg-muted/20">
                        <ResidentExpandedView
                          resident={resident}
                          home={home}
                          staffMap={staffMap}
                          pathwayPlans={pathwayPlans}
                          ilsPlans={ilsPlans}
                          allowances={allowances}
                          savings={savings}
                        />
                      </td>
                    </tr>
                  )}
                </div>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      {showTransferModal && <TransferInModal onClose={() => setShowTransferModal(false)} onSave={() => { onTransfer(); setShowTransferModal(false); }} />}
      {showMovedOnModal && <MovedOnModal residents={filtered} onClose={() => setShowMovedOnModal(false)} onSave={() => { onMovedOn(); setShowMovedOnModal(false); }} />}
    </div>
  );
}