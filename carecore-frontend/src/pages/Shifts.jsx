import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Calendar, Grid3x3, CalendarDays } from "lucide-react";
import RotaTab from "@/components/shifts/RotaTab";
import HandoversTab from "@/components/shifts/HandoversTab";

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Shifts() {
  const { user } = useOutletContext();
  const [selectedHomeId, setSelectedHomeId] = useState("");
  const [viewMode, setViewMode] = useState("calendar");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

  const isAdmin = user?.role === "admin";
  const isTL = user?.role === "team_leader";

  const { data: allHomes = [] } = useQuery({
    queryKey: ["homes-24h"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: "active" }),
  });

  const { data: myStaffProfile } = useQuery({
    queryKey: ["my-staff-profile", user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.StaffProfile.filter({ org_id: ORG_ID, email: user?.email });
      return profiles[0] || null;
    },
    enabled: !!user?.email,
  });

  const homes = useMemo(() => {
    if (isAdmin) return allHomes;
    if (isTL && myStaffProfile?.home_ids?.length) {
      return allHomes.filter(h => myStaffProfile.home_ids.includes(h.id));
    }
    return [];
  }, [allHomes, isAdmin, isTL, myStaffProfile]);

  const selectedHome = homes.find(h => h.id === selectedHomeId) || homes[0] || null;
  const effectiveHomeId = selectedHomeId || selectedHome?.id || "";

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => setWeekStart(getWeekStart(new Date()));

  if (!isAdmin && !isTL) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <p>Shifts & Rota is only accessible to team leaders and admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Shifts & Rota</h1>
          <p className="text-sm text-muted-foreground mt-0.5">24 Hours Housing homes only</p>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Home selector */}
        <Select value={effectiveHomeId} onValueChange={setSelectedHomeId}>
          <SelectTrigger className="w-56 rounded-xl">
            <SelectValue placeholder="Select home…" />
          </SelectTrigger>
          <SelectContent>
            {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Week nav */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-medium px-2 min-w-[160px] text-center">{weekLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={goToday}>Today</Button>

        {/* View toggle */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 ml-auto">
          <button onClick={() => setViewMode("calendar")} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${viewMode === "calendar" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </button>
          <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${viewMode === "grid" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
            <Grid3x3 className="w-3.5 h-3.5" /> Rota Grid
          </button>
        </div>
      </div>

      {/* Main tabs */}
      {homes.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No 24 Hours Housing homes found</p>
          <p className="text-sm text-muted-foreground mt-1">No active homes found. Add a home to get started.</p>
        </div>
      ) : (
        <Tabs defaultValue="rota">
          <TabsList className="bg-muted rounded-xl">
            <TabsTrigger value="rota" className="rounded-lg">Rota</TabsTrigger>
            <TabsTrigger value="handovers" className="rounded-lg">Handovers</TabsTrigger>
          </TabsList>

          <TabsContent value="rota" className="mt-4">
            <RotaTab
              home={selectedHome || homes[0]}
              weekStart={weekStart}
              viewMode={viewMode}
              user={user}
              myStaffProfile={myStaffProfile}
            />
          </TabsContent>

          <TabsContent value="handovers" className="mt-4">
            <HandoversTab
              home={selectedHome || homes[0]}
              user={user}
              myStaffProfile={myStaffProfile}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}