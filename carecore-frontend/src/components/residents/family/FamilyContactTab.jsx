import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Phone, Video, Users, Mail, MessageSquare, Globe, CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import FamilyContactForm from "./FamilyContactForm";
import FamilyContactDetail from "./FamilyContactDetail";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, parseISO } from "date-fns";

function DatePickerInput({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) });
  const startPad = getDay(startOfMonth(viewDate));
  const selected = value ? new Date(value + "T00:00:00") : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-8 px-3 rounded-md border border-input bg-card text-xs hover:border-primary transition-colors min-w-[130px]"
      >
        <CalendarIcon className="w-3 h-3 text-muted-foreground" />
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? format(new Date(value + "T00:00:00"), "dd MMM yyyy") : placeholder}
        </span>
        {value && (
          <X className="w-3 h-3 text-muted-foreground ml-auto hover:text-foreground" onClick={e => { e.stopPropagation(); onChange(""); }} />
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-10 left-0 bg-card border border-border rounded-xl shadow-xl p-3 w-64">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setViewDate(d => subMonths(d, 1))} className="p-1 hover:bg-muted rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">{format(viewDate, "MMMM yyyy")}</span>
            <button onClick={() => setViewDate(d => addMonths(d, 1))} className="p-1 hover:bg-muted rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startPad }).map((_, i) => <div key={"pad-" + i} />)}
            {days.map(day => {
              const isSelected = selected && isSameDay(day, selected);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { onChange(format(day, "yyyy-MM-dd")); setOpen(false); }}
                  className={`text-xs rounded-md py-1.5 w-full text-center transition-colors
                    ${isSelected ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-foreground"}`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const MOOD_COLOURS = {
  happy: "bg-green-100 text-green-700",
  calm: "bg-blue-100 text-blue-700",
  anxious: "bg-amber-100 text-amber-700",
  distressed: "bg-red-100 text-red-700",
  angry: "bg-red-100 text-red-700",
  withdrawn: "bg-slate-100 text-slate-700",
  excited: "bg-purple-100 text-purple-700",
  neutral: "bg-gray-100 text-gray-700",
};

const METHOD_ICONS = {
  phone_call: <Phone className="w-4 h-4" />,
  video_call: <Video className="w-4 h-4" />,
  in_person_visit: <Users className="w-4 h-4" />,
  letter: <Mail className="w-4 h-4" />,
  text_message: <MessageSquare className="w-4 h-4" />,
  social_media: <Globe className="w-4 h-4" />,
};

function RelationshipIcon({ rel }) {
  const icons = {
    mother: "👩", father: "👨", sibling: "👤", grandparent: "👴",
    aunt_uncle: "👥", other_family: "👨‍👩‍👧", friend: "🤝",
    professional: "💼", unknown: "❓",
  };
  return icons[rel] || "👤";
}

export default function FamilyContactTab({ residents, homes, staff, user, isAdminOrTL }) {
  const qc = useQueryClient();
  const [selectedResident, setSelectedResident] = useState(residents[0]?.id || null);
  const [showForm, setShowForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["family-contacts"],
    queryFn: () => secureGateway.filter("FamilyContact", { is_deleted: false }, "-contact_datetime", 500),
  });

  const resident = residents.find(r => r.id === selectedResident);
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const filtered = useMemo(() => {
    let result = contacts.filter(c => c.resident_id === selectedResident);
    if (dateFrom) result = result.filter(c => (c.contact_datetime || "").slice(0, 10) >= dateFrom);
    if (dateTo) result = result.filter(c => (c.contact_datetime || "").slice(0, 10) <= dateTo);
    return result.sort((a, b) => (b.contact_datetime || "").localeCompare(a.contact_datetime || ""));
  }, [contacts, selectedResident, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const thisMonth = new Date();
    const monthAgo = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split("T")[0];
    const thisMonthContacts = filtered.filter(c => c.contact_datetime?.split("T")[0] >= monthAgo);
    const withConcerns = filtered.filter(c => c.any_concerns);
    const lastContact = filtered[0];
    const personCounts = {};
    filtered.forEach(c => {
      personCounts[c.contact_person_name] = (personCounts[c.contact_person_name] || 0) + 1;
    });
    const mostFrequent = Object.entries(personCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      totalThisMonth: thisMonthContacts.length,
      lastContactDate: lastContact?.contact_datetime,
      mostFrequentPerson: mostFrequent?.[0],
      withConcernsThisMonth: withConcerns.filter(c => c.contact_datetime?.split("T")[0] >= monthAgo).length,
    };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Family Contact Log</h3>
        {residents.length > 1 && (
          <Select value={selectedResident} onValueChange={setSelectedResident}>
            <SelectTrigger className="w-56 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        {isAdminOrTL && <Button onClick={() => setShowForm(true)} className="gap-1"><Plus className="w-4 h-4" /> Log Contact</Button>}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">This Month</p>
          <p className="text-2xl font-bold mt-1">{stats.totalThisMonth}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">Last Contact</p>
          <p className="text-xs font-medium mt-1">{stats.lastContactDate ? new Date(stats.lastContactDate).toLocaleDateString("en-GB") : "—"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">Most Frequent</p>
          <p className="text-sm font-medium mt-1 truncate">{stats.mostFrequentPerson || "—"}</p>
        </div>
        {stats.withConcernsThisMonth > 0 && (
          <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
            <p className="text-xs text-amber-700 font-medium">Concerns This Month</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">⚠ {stats.withConcernsThisMonth}</p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Filter by date:</span>
        <DatePickerInput value={dateFrom} onChange={setDateFrom} placeholder="From date" />
        <span className="text-xs text-muted-foreground">to</span>
        <DatePickerInput value={dateTo} onChange={setDateTo} placeholder="To date" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">Clear</button>
        )}
      </div>

      {/* Contacts List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground text-sm">No contacts logged.</div>
        ) : (
          filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedContact(c)}
              className="block w-full text-left bg-card border border-border rounded-lg p-4 hover:border-primary hover:bg-muted/20 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{RelationshipIcon({ rel: c.contact_person_relationship })}</span>
                    <span className="font-semibold">{c.contact_person_name}</span>
                    <span className="text-xs text-muted-foreground capitalize">({c.contact_person_relationship?.replace(/_/g, " ")})</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    {METHOD_ICONS[c.contact_method]} {c.contact_method?.replace(/_/g, " ")} · {c.duration_minutes}m
                    {c.was_supervised && <span className="text-blue-600">🔒 Supervised</span>}
                    {c.is_court_ordered && <span className="text-amber-600">⚖️ Court ordered</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MOOD_COLOURS[c.mood_before] || "bg-gray-100"}`}>{c.mood_before}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MOOD_COLOURS[c.mood_after] || "bg-gray-100"}`}>{c.mood_after}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">{new Date(c.contact_datetime).toLocaleDateString("en-GB")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.contact_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                  {c.any_concerns && <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Concerns</span>}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Modals */}
      {showForm && <FamilyContactForm resident={resident} residents={residents} staff={staff} user={user} onClose={() => setShowForm(false)} onSave={() => { qc.invalidateQueries({ queryKey: ["family-contacts"] }); setShowForm(false); }} />}
      {selectedContact && <FamilyContactDetail contact={selectedContact} resident={resident} staff={staffMap} onClose={() => setSelectedContact(null)} onUpdate={() => qc.invalidateQueries({ queryKey: ["family-contacts"] })} />}
    </div>
  );
}