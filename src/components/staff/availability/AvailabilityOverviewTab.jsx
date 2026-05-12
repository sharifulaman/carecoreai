import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekDates() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const days = Math.ceil((d - new Date()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  if (days <= 60) return "soon";
  return "ok";
}

function CellTooltip({ member, date, weekly, override, profile }) {
  const dayName = DAYS[new Date(date + "T12:00:00").getDay() === 0 ? 6 : new Date(date + "T12:00:00").getDay() - 1];
  const weeklyDay = weekly?.find(w => w.day_of_week === dayName && w.staff_id === member.id);
  const isFixed = profile?.fixed_days_off?.includes(dayName);
  const activeOverride = override?.find(o => o.staff_id === member.id && o.date_from <= date && o.date_to >= date);

  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border border-border rounded-lg shadow-lg p-2.5 text-xs w-44 pointer-events-none">
      <p className="font-semibold mb-1">{member.full_name}</p>
      {activeOverride ? (
        <p className="capitalize">{activeOverride.override_type}{activeOverride.reason ? `: ${activeOverride.reason}` : ""}</p>
      ) : isFixed ? (
        <p>Fixed day off</p>
      ) : weeklyDay ? (
        <>
          <p>{weeklyDay.is_available ? "Available" : "Not available"}</p>
          {weeklyDay.is_available && <p>{weeklyDay.available_from} – {weeklyDay.available_until}</p>}
          {weeklyDay.shift_type_pref && weeklyDay.shift_type_pref !== "none" && <p className="capitalize">Pref: {weeklyDay.shift_type_pref}</p>}
        </>
      ) : (
        <p className="text-muted-foreground">No profile set</p>
      )}
    </div>
  );
}

function AvailCell({ member, date, weekly, overrides, profile, onClick }) {
  const [hover, setHover] = useState(false);
  const dayName = DAYS[(() => { const d = new Date(date + "T12:00:00").getDay(); return d === 0 ? 6 : d - 1; })()];
  const isFixed = profile?.fixed_days_off?.includes(dayName);
  const activeOverride = overrides?.find(o => o.staff_id === member.id && o.date_from <= date && o.date_to >= date);
  const weeklyDay = weekly?.find(w => w.day_of_week === dayName && w.staff_id === member.id);

  let bg = "bg-white border border-dashed border-border";
  if (!profile) bg = "bg-gray-50";
  else if (activeOverride) {
    const t = activeOverride.override_type;
    if (t === "holiday") bg = activeOverride.approved ? "bg-blue-200" : "bg-amber-200";
    else if (t === "sick") bg = "bg-red-200";
    else if (t === "training" || t === "lieu_day") bg = "bg-purple-200";
    else bg = "bg-gray-200";
  } else if (isFixed) bg = "bg-red-100";
  else if (weeklyDay?.is_available === false) bg = "bg-red-100";
  else if (weeklyDay?.is_available) bg = "bg-green-200";

  return (
    <td className="p-0.5 relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button onClick={() => onClick(member)} className={`w-full h-7 rounded text-xs transition-all hover:opacity-80 ${bg}`} />
      {hover && <CellTooltip member={member} date={date} weekly={weekly} override={overrides} profile={profile} />}
    </td>
  );
}

export default function AvailabilityOverviewTab({ user, onOpenPanel }) {
  const isAdminOrTL = user?.role === "admin" || user?.role === "team_leader";
  const [homeFilter, setHomeFilter] = useState("all");
  const [view, setView] = useState("grid");
  const weekDates = useMemo(() => getWeekDates(), []);
  const today = new Date().toISOString().split("T")[0];

  const { data: allStaff = [] } = useQuery({ queryKey: ["staff-avail-overview"], queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID, status: "active" }) });
  const { data: homes = [] } = useQuery({ queryKey: ["homes-avail"], queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: "active" }) });
  const { data: weekly = [] } = useQuery({ queryKey: ["weekly-all"], queryFn: () => base44.entities.StaffWeeklyAvailability.filter({ org_id: ORG_ID }) });
  const { data: overrides = [] } = useQuery({ queryKey: ["overrides-all"], queryFn: () => base44.entities.StaffAvailabilityOverride.filter({ org_id: ORG_ID }) });
  const { data: profiles = [] } = useQuery({ queryKey: ["profiles-all"], queryFn: () => base44.entities.StaffAvailabilityProfile.filter({ org_id: ORG_ID }) });

  const filteredStaff = useMemo(() => {
    let list = allStaff;
    if (!isAdminOrTL) return [];
    if (homeFilter !== "all") list = list.filter(s => s.home_ids?.includes(homeFilter));
    return list;
  }, [allStaff, homeFilter, isAdminOrTL]);

  const getProfile = (staffId) => profiles.find(p => p.staff_id === staffId);

  // Expiring certifications
  const expiringStaff = useMemo(() => {
    const CERTS = [
      { key: "dbs_expiry", label: "DBS", source: "staffProfile" },
      { key: "first_aid_expiry", label: "First Aid", source: "avProfile" },
      { key: "medication_training_expiry", label: "Medication Training", source: "avProfile" },
      { key: "manual_handling_expiry", label: "Manual Handling", source: "avProfile" },
      { key: "safeguarding_expiry", label: "Safeguarding", source: "avProfile" },
    ];
    const rows = [];
    allStaff.forEach(s => {
      const p = profiles.find(pr => pr.staff_id === s.id);
      CERTS.forEach(cert => {
        const dateStr = cert.source === "staffProfile" ? s[cert.key] : p?.[cert.key];
        const st = expiryStatus(dateStr);
        if (st && st !== "ok") {
          const d = new Date(dateStr);
          rows.push({ staff: s, cert: cert.label, expiry: dateStr, status: st, timestamp: d.getTime() });
        }
      });
    });
    return rows.sort((a, b) => a.timestamp - b.timestamp);
  }, [allStaff, profiles]);

  if (!isAdminOrTL) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Availability overview is available to admins and team leaders only.</div>;
  }

  const STATUS_BADGE = { expired: "bg-red-100 text-red-700", critical: "bg-red-100 text-red-700", warning: "bg-amber-100 text-amber-700", soon: "bg-yellow-100 text-yellow-700" };
  const STATUS_LABEL = { expired: "Expired", critical: "< 7 days", warning: "< 30 days", soon: "< 60 days" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 p-1 bg-muted rounded-lg">
          <button onClick={() => setView("grid")} className={`px-3 py-1 rounded text-xs font-medium transition-all ${view === "grid" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>Weekly Grid</button>
          <button onClick={() => setView("expiring")} className={`px-3 py-1 rounded text-xs font-medium transition-all ${view === "expiring" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
            Expiring Certs {expiringStaff.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs">{expiringStaff.length}</span>}
          </button>
        </div>
        {view === "grid" && (
          <Select value={homeFilter} onValueChange={setHomeFilter}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Homes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Homes</SelectItem>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Legend */}
      {view === "grid" && (
        <div className="flex flex-wrap gap-2 text-xs">
          {[["bg-green-200", "Available"], ["bg-red-100", "Unavailable"], ["bg-blue-200", "Holiday (approved)"], ["bg-amber-200", "Holiday (pending)"], ["bg-purple-200", "Training / Lieu"], ["bg-gray-50", "No profile"]].map(([bg, label]) => (
            <span key={label} className="flex items-center gap-1"><span className={`w-3 h-3 rounded ${bg} border border-border`} />{label}</span>
          ))}
        </div>
      )}

      {view === "grid" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground w-32 text-xs">Staff</th>
                {weekDates.map((date, i) => (
                  <th key={date} className="px-0.5 py-1.5 font-medium text-muted-foreground text-center">
                    <div>{DAY_LABELS[i]}</div>
                    <div className={`text-xs ${date === today ? "text-primary font-bold" : "text-muted-foreground"}`}>{new Date(date + "T12:00:00").getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No staff found.</td></tr>
              ) : filteredStaff.map(s => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-2 py-0.5">
                    <button onClick={() => onOpenPanel(s)} className="text-left hover:text-primary transition-colors">
                      <p className="font-medium truncate max-w-[110px]">{s.full_name}</p>
                    </button>
                  </td>
                  {weekDates.map(date => (
                    <AvailCell key={date} member={s} date={date} weekly={weekly} overrides={overrides} profile={getProfile(s.id)} onClick={onOpenPanel} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "expiring" && (
        <div className="space-y-2">
          {expiringStaff.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No certifications expiring in the next 60 days.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["Staff", "Role", "Certification", "Expiry", "Status", ""].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expiringStaff.map((row, i) => {
                  const homes2 = homes.filter(h => row.staff.home_ids?.includes(h.id)).map(h => h.name).join(", ");
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{row.staff.full_name}</td>
                      <td className="px-3 py-2 capitalize text-muted-foreground">{row.staff.role?.replace("_", " ")}</td>
                      <td className="px-3 py-2">{row.cert}</td>
                      <td className="px-3 py-2">{row.expiry}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[row.status]}`}>{STATUS_LABEL[row.status]}</span></td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onOpenPanel(row.staff, "qualifications")}>View Profile</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}