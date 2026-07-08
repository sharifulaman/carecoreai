import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Plus, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TransitionForm from "../components/transitions/TransitionForm";

const STAGE_COLORS = {
  initial_assessment: "bg-slate-500/10 text-slate-500",
  planning: "bg-blue-500/10 text-blue-500",
  preparation: "bg-amber-500/10 text-amber-500",
  active_move: "bg-purple-500/10 text-purple-500",
  post_move_support: "bg-teal-500/10 text-teal-500",
  closed: "bg-green-500/10 text-green-500",
};
const STAGE_LABELS = {
  initial_assessment: "Initial Assessment",
  planning: "Planning",
  preparation: "Preparation",
  active_move: "Active Move",
  post_move_support: "Post-Move Support",
  closed: "Closed",
};
const TYPE_LABELS = {
  move_on: "Move On", pathway_planning: "Pathway Planning",
  tenancy_setup: "Tenancy Setup", emergency_move: "Emergency Move", step_down: "Step Down",
};

export default function Transitions() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const role = user?.role === "user" ? "support_worker" : (user?.role || "support_worker");
  const canEdit = role === "admin" || role === "admin_officer";

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("all");

  const { data: transitions = [], isLoading } = useQuery({
    queryKey: ["transitions"],
    queryFn: () => base44.entities.Transition.filter({ org_id: ORG_ID }),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-active"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, status: "active" }),
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: "active" }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transition.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transitions"] }); setShowForm(false); toast.success("Transition plan created"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transition.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["transitions"] }); toast.success("Updated"); },
  });

  const active = transitions.filter(t => t.status === "active");
  const completed = transitions.filter(t => t.status === "completed");

  const filtered = (list) => list.filter(t => {
    const matchSearch = t.resident_name?.toLowerCase().includes(search.toLowerCase());
    const matchStage = filterStage === "all" || t.pathway_stage === filterStage;
    return matchSearch && matchStage;
  });

  const TransitionCard = ({ t }) => (
    <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {t.resident_name?.charAt(0) || "?"}
          </div>
          <div>
            <p className="font-semibold">{t.resident_name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{t.home_name || "—"} · {TYPE_LABELS[t.transition_type] || t.transition_type}</p>
          </div>
        </div>
        <Badge className={cn("text-xs", STAGE_COLORS[t.pathway_stage] || "bg-muted text-muted-foreground")}>
          {STAGE_LABELS[t.pathway_stage] || t.pathway_stage}
        </Badge>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 mb-3">
        {t.planned_date && <p><span className="font-medium text-foreground">Planned:</span> {t.planned_date}</p>}
        {t.destination_address && <p><span className="font-medium text-foreground">Destination:</span> {t.destination_address}</p>}
        {t.destination_type && <p><span className="font-medium text-foreground">Type:</span> {t.destination_type?.replace(/_/g, " ")}</p>}
        {t.notes && <p className="line-clamp-2">{t.notes}</p>}
      </div>

      {canEdit && t.status === "active" && (
        <div className="pt-2 border-t border-border flex flex-wrap gap-2">
          {Object.keys(STAGE_LABELS).filter(s => s !== t.pathway_stage).slice(0, 2).map(stage => (
            <button
              key={stage}
              onClick={() => updateMutation.mutate({ id: t.id, data: { pathway_stage: stage } })}
              className="text-xs text-primary hover:underline"
            >
              → {STAGE_LABELS[stage]}
            </button>
          ))}
          <button
            onClick={() => updateMutation.mutate({ id: t.id, data: { status: "completed", actual_date: new Date().toISOString().split("T")[0] } })}
            className="text-xs text-green-600 hover:underline ml-auto font-medium"
          >
            Mark Complete ✓
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {showForm && (
        <TransitionForm
          residents={residents}
          homes={homes}
          onSubmit={(d) => createMutation.mutate({ ...d, org_id: ORG_ID })}
          onClose={() => setShowForm(false)}
          saving={createMutation.isPending}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Housing & Transitions</h1>
          <p className="text-muted-foreground text-sm mt-1">{active.length} active plans · {completed.length} completed</p>
        </div>
        {canEdit && (
          <Button className="gap-2 rounded-xl" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> New Transition Plan
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STAGE_LABELS).map(([key, label]) => {
          const count = transitions.filter(t => t.pathway_stage === key && t.status === "active").length;
          return (
            <div key={key} className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by resident..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={filterStage} onValueChange={setFilterStage}>
          <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="All Stages" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {Object.entries(STAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-muted rounded-xl">
          <TabsTrigger value="active" className="rounded-lg gap-2"><ArrowRightLeft className="w-4 h-4" /> Active ({filtered(active).length})</TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg gap-2">Completed ({filtered(completed).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
          ) : filtered(active).length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <ArrowRightLeft className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No active transition plans.</p>
              {canEdit && <Button className="mt-4 gap-2 rounded-xl" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Create First Plan</Button>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered(active).map(t => <TransitionCard key={t.id} t={t} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {filtered(completed).length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <p className="text-muted-foreground">No completed transitions yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered(completed).map(t => <TransitionCard key={t.id} t={t} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}