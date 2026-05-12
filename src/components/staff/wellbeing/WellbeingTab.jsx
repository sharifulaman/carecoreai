import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Heart, ExternalLink, X, Star, TrendingUp, AlertTriangle } from "lucide-react";
import { format, subMonths } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const EAP_LINKS = [
  { name: "Mind", desc: "Mental health support & information", url: "https://www.mind.org.uk", color: "bg-green-50 border-green-200 text-green-700" },
  { name: "ACAS", desc: "Workplace advice & mediation", url: "https://www.acas.org.uk", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { name: "Samaritans", desc: "24/7 emotional support — 116 123", url: "https://www.samaritans.org", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { name: "NHS Every Mind Matters", desc: "Practical mental wellbeing tips", url: "https://www.nhs.uk/every-mind-matters/", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { name: "Carers UK", desc: "Support for care workers & carers", url: "https://www.carersuk.org", color: "bg-amber-50 border-amber-200 text-amber-700" },
];

function StarRating({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={disabled} onClick={() => onChange?.(n)}
          className={`transition-colors ${disabled ? "cursor-default" : "hover:scale-110"}`}>
          <Star className={`w-7 h-7 ${n <= value ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

function CheckInForm({ staffProfile, onClose, onSubmit }) {
  const currentMonth = format(new Date(), "yyyy-MM");
  const [form, setForm] = useState({ mood_rating: 0, workload_rating: 0, support_rating: 0, notes: "", is_anonymous: true });
  const valid = form.mood_rating > 0 && form.workload_rating > 0 && form.support_rating > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            <h3 className="font-semibold">Monthly Wellbeing Check-In</h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Your responses are anonymous and help us support the team better.</p>

        {[
          { key: "mood_rating", label: "How are you feeling overall?", hint: "1 = Very low · 5 = Great" },
          { key: "workload_rating", label: "How manageable is your workload?", hint: "1 = Overwhelming · 5 = Very manageable" },
          { key: "support_rating", label: "How supported do you feel by your team?", hint: "1 = Not supported · 5 = Very supported" },
        ].map(({ key, label, hint }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            <p className="text-[11px] text-muted-foreground">{hint}</p>
            <StarRating value={form[key]} onChange={v => setForm(f => ({ ...f, [key]: v }))} />
          </div>
        ))}

        <div>
          <label className="text-xs text-muted-foreground">Anything you'd like to share? (optional)</label>
          <textarea className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Any concerns, positives, or suggestions…"
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" className="rounded w-3 h-3" checked={form.is_anonymous}
            onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} />
          Submit anonymously (recommended)
        </label>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid} onClick={() => onSubmit({ ...form, month: currentMonth, staff_id: form.is_anonymous ? null : staffProfile?.id, home_id: staffProfile?.home_ids?.[0] })}>
            Submit Check-In
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WellbeingTab({ user, staff = [], homes = [], staffProfile }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "admin_officer";
  const currentMonth = format(new Date(), "yyyy-MM");
  const [showForm, setShowForm] = useState(false);
  const [filterHomeId, setFilterHomeId] = useState("all");

  const { data: checkins = [] } = useQuery({
    queryKey: ["wellbeing-checkins"],
    queryFn: () => secureGateway.filter("WellbeingCheckIn"),
    staleTime: 5 * 60 * 1000,
  });

  const submitCheckin = useMutation({
    mutationFn: (data) => secureGateway.create("WellbeingCheckIn", { ...data, org_id: ORG_ID }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wellbeing-checkins"] });
      setShowForm(false);
      toast.success("Check-in submitted. Thank you!");
    },
  });

  const alreadyCheckedIn = checkins.some(c => c.month === currentMonth && (c.staff_id === staffProfile?.id || (!c.staff_id && !staffProfile?.id)));

  // Trend data — last 6 months aggregated
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = format(subMonths(new Date(), 5 - i), "yyyy-MM");
      const monthCheckins = checkins.filter(c => c.month === m && (filterHomeId === "all" || c.home_id === filterHomeId));
      if (!monthCheckins.length) return { label: m.slice(5), mood: null, workload: null, support: null };
      const avg = (key) => parseFloat((monthCheckins.reduce((s, c) => s + (c[key] || 0), 0) / monthCheckins.length).toFixed(1));
      return { label: m.slice(5), mood: avg("mood_rating"), workload: avg("workload_rating"), support: avg("support_rating"), count: monthCheckins.length };
    });
  }, [checkins, filterHomeId]);

  // This month per-home averages
  const homeStats = useMemo(() => {
    return homes.map(h => {
      const hc = checkins.filter(c => c.month === currentMonth && c.home_id === h.id);
      if (!hc.length) return { home: h, avg: null, count: 0 };
      const avg = parseFloat(((hc.reduce((s, c) => s + c.mood_rating + c.workload_rating + c.support_rating, 0)) / (hc.length * 3)).toFixed(1));
      return { home: h, avg, count: hc.length };
    });
  }, [homes, checkins, currentMonth]);

  const thisMonthAll = checkins.filter(c => c.month === currentMonth);
  const overallAvg = thisMonthAll.length
    ? parseFloat(((thisMonthAll.reduce((s, c) => s + c.mood_rating + c.workload_rating + c.support_rating, 0)) / (thisMonthAll.length * 3)).toFixed(1))
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2"><Heart className="w-4 h-4 text-rose-500" /> Staff Wellbeing</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Anonymous monthly check-ins · {thisMonthAll.length} responses this month</p>
        </div>
        {!alreadyCheckedIn && (
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-rose-500 hover:bg-rose-600">
            <Heart className="w-4 h-4" /> Start Check-In
          </Button>
        )}
        {alreadyCheckedIn && (
          <Badge className="bg-green-100 text-green-700">✓ Checked in this month</Badge>
        )}
      </div>

      {/* EAP Resources — visible to all */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-3">Employee Assistance — Support Resources</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {EAP_LINKS.map(link => (
            <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
              className={`flex items-start gap-2 p-3 rounded-lg border ${link.color} hover:opacity-80 transition-opacity`}>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">{link.name}</p>
                <p className="text-[11px] mt-0.5 opacity-80">{link.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Admin dashboard */}
      {isAdmin && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-medium text-muted-foreground">Filter by home:</p>
            <Select value={filterHomeId} onValueChange={setFilterHomeId}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Homes</SelectItem>
                {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {overallAvg !== null && (
              <div className="flex items-center gap-1.5 text-sm">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-semibold">Overall score this month: </span>
                <span className={`font-bold ${overallAvg >= 4 ? "text-green-600" : overallAvg >= 3 ? "text-amber-600" : "text-red-600"}`}>
                  {overallAvg}/5
                </span>
              </div>
            )}
          </div>

          {/* Per-home scores */}
          {homeStats.some(h => h.count > 0) && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {homeStats.filter(h => h.count > 0).map(({ home, avg, count }) => (
                <div key={home.id} className="bg-card rounded-xl border border-border p-4">
                  <p className="text-xs font-medium text-muted-foreground">{home.name}</p>
                  <div className="flex items-end justify-between mt-2">
                    <span className={`text-2xl font-bold ${avg >= 4 ? "text-green-600" : avg >= 3 ? "text-amber-600" : "text-red-600"}`}>
                      {avg}/5
                    </span>
                    <span className="text-xs text-muted-foreground">{count} response{count !== 1 ? "s" : ""}</span>
                  </div>
                  {avg < 3 && (
                    <p className="text-[10px] text-red-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Below threshold — consider follow-up
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Trend chart */}
          {trendData.some(d => d.mood !== null) && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold mb-3">Wellbeing Trend — Last 6 Months</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="mood" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} name="Mood" connectNulls />
                  <Line type="monotone" dataKey="workload" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Workload" connectNulls />
                  <Line type="monotone" dataKey="support" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Support" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {thisMonthAll.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-10 text-center text-muted-foreground text-sm">
              No check-ins submitted this month yet. Encourage staff to complete their monthly check-in.
            </div>
          )}
        </>
      )}

      {showForm && (
        <CheckInForm
          staffProfile={staffProfile}
          onClose={() => setShowForm(false)}
          onSubmit={submitCheckin.mutate}
        />
      )}
    </div>
  );
}