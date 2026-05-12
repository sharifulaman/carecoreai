import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Plus, Phone, Video, Users, Mail, MessageSquare, Globe } from "lucide-react";
import { toast } from "sonner";
import FamilyContactForm from "./FamilyContactForm";
import FamilyContactDetail from "./FamilyContactDetail";

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
    if (dateFrom) result = result.filter(c => c.contact_datetime >= dateFrom);
    if (dateTo) result = result.filter(c => c.contact_datetime <= dateTo + "T23:59:59");
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
        <Button onClick={() => setShowForm(true)} className="gap-1"><Plus className="w-4 h-4" /> Log Contact</Button>
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
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-32 text-xs h-8" placeholder="From" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-32 text-xs h-8" placeholder="To" />
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