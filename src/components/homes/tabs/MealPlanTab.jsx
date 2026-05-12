import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const MEALS = ["breakfast", "lunch", "snacks", "dinner"];
const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", snacks: "Snacks", dinner: "Dinner" };

function getDayKey(date) {
  // Returns a string key like "2026-04-23"
  return date.toISOString().split("T")[0];
}

function getWeekBounds(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: mon, end: sun };
}

export default function MealPlanTab({ homeId, homeName, user }) {
  const qc = useQueryClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(new Date(today));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  // Compute visible week
  const { start: weekStart, end: weekEnd } = getWeekBounds(viewDate);

  // Build array of 7 days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const monthLabel = weekStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} — ${weekEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  // Fetch meal plans for this home
  const { data: plans = [] } = useQuery({
    queryKey: ["meal-plans", homeId],
    queryFn: () => base44.entities.MealPlan.filter({ org_id: ORG_ID, home_id: homeId }, "-week_start", 52),
  });

  // Find plan whose week_start is the Monday of current view
  const weekStartStr = getDayKey(weekStart);
  const currentPlan = plans.find(p => p.week_start === weekStartStr);

  const create = useMutation({
    mutationFn: (data) => base44.entities.MealPlan.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meal-plans", homeId] }); setEditing(false); toast.success("Meal plan saved"); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MealPlan.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["meal-plans", homeId] }); setEditing(false); toast.success("Meal plan updated"); },
  });

  const startEdit = () => {
    // Draft is keyed by date string e.g. "2026-04-23" -> { breakfast, lunch, snacks, dinner }
    const init = {};
    weekDays.forEach(d => {
      const key = getDayKey(d);
      // Try to find from currentPlan.days keyed by day-of-week name
      const dayName = d.toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();
      init[key] = currentPlan?.days?.[dayName] || {};
    });
    setDraft(init);
    setEditing(true);
  };

  const handleSave = () => {
    // Convert draft (date-keyed) back to day-name-keyed for storage
    const days = {};
    weekDays.forEach(d => {
      const key = getDayKey(d);
      const dayName = d.toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();
      days[dayName] = draft[key] || {};
    });
    const data = {
      org_id: ORG_ID,
      home_id: homeId,
      home_name: homeName,
      week_start: weekStartStr,
      created_by: user?.email,
      created_by_name: user?.full_name,
      days,
    };
    if (currentPlan) update.mutate({ id: currentPlan.id, data: { days } });
    else create.mutate(data);
  };

  const setMeal = (dateKey, meal, val) =>
    setDraft(d => ({ ...d, [dateKey]: { ...(d[dateKey] || {}), [meal]: val } }));

  const getMeal = (date, meal) => {
    const dayName = date.toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();
    return currentPlan?.days?.[dayName]?.[meal] || null;
  };

  const changeWeek = (dir) => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + dir * 7);
    setViewDate(d);
    setEditing(false);
  };

  const goToday = () => {
    setViewDate(new Date(today));
    setEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-xl">Meal Plan</h3>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditing(false)}>Cancel</Button>
            <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-2" onClick={handleSave} disabled={create.isPending || update.isPending}>
              <Calendar className="w-4 h-4" /> Save Plan
            </Button>
          </div>
        ) : (
          <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-2" onClick={startEdit}>
            <Calendar className="w-4 h-4" /> UPDATE
          </Button>
        )}
      </div>

      {/* Month label + nav row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>{monthLabel}</span>
        </div>
        <div className="flex-1" />
        <button className="flex items-center gap-1.5 text-xs border border-border rounded-lg px-3 h-8 hover:bg-muted text-muted-foreground">
          <Download className="w-3.5 h-3.5" /> DOWNLOAD
        </button>
        <span className="text-sm text-muted-foreground">{weekLabel}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => changeWeek(-1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground text-sm">‹</button>
          <button onClick={() => changeWeek(1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground text-sm">›</button>
        </div>
        <button onClick={goToday} className="text-xs border border-border rounded-lg px-3 h-8 hover:bg-muted text-muted-foreground font-medium">TODAY</button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="text-center py-3 px-4 w-20">
                <button onClick={() => changeWeek(-1)} className="text-muted-foreground hover:text-foreground text-lg leading-none">↑</button>
              </th>
              {MEALS.map(m => (
                <th key={m} className="text-center py-3 px-4 text-sm font-semibold text-foreground">
                  {MEAL_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weekDays.map((date, idx) => {
              const dateKey = getDayKey(date);
              const isToday = date.getTime() === today.getTime();
              return (
                <tr key={dateKey} className={`border-b border-border last:border-0 ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  {/* Date cell */}
                  <td className="px-4 py-4 text-center">
                    {isToday ? (
                      <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold mx-auto">
                        {date.getDate()}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground font-medium">{date.getDate()}</span>
                    )}
                  </td>
                  {MEALS.map(meal => (
                    <td key={meal} className="px-4 py-4 text-center">
                      {editing ? (
                        <Input
                          className="text-xs h-8 text-center"
                          value={draft?.[dateKey]?.[meal] || ""}
                          onChange={e => setMeal(dateKey, meal, e.target.value)}
                          placeholder="—"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {getMeal(date, meal) || "-"}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}