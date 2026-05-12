import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function SessionLogModal({ resident, domains, onClose, onSave, user }) {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionType, setSessionType] = useState("one_to_one");
  const [duration, setDuration] = useState("");
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [engagement, setEngagement] = useState("good");
  const [notes, setNotes] = useState("");
  const [achievements, setAchievements] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [nextDate, setNextDate] = useState("");

  const toggleDomain = (domain) => {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleSave = () => {
    onSave({
      resident_id: resident.id,
      resident_name: resident.display_name,
      home_id: resident.home_id,
      session_date: sessionDate,
      session_type: sessionType,
      duration_minutes: parseInt(duration) || 0,
      domains_covered: selectedDomains,
      young_person_engagement: engagement,
      session_notes: notes,
      achievements_this_session: achievements,
      next_session_plan: nextPlan,
      next_session_date: nextDate,
      worker_id: user.id,
      worker_name: user.full_name
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">Log ILS Session - {resident.display_name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_to_one">1:1 Session</SelectItem>
                  <SelectItem value="group">Group Activity</SelectItem>
                  <SelectItem value="community_activity">Community Activity</SelectItem>
                  <SelectItem value="home_visit">Home Visit</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">YP Engagement</label>
              <Select value={engagement} onValueChange={setEngagement}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="reluctant">Reluctant</SelectItem>
                  <SelectItem value="refused">Refused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Domains Covered</label>
            <div className="grid grid-cols-2 gap-2">
              {domains.map(domain => (
                <label key={domain.name} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedDomains.includes(domain.name)}
                    onChange={() => toggleDomain(domain.name)}
                    className="w-4 h-4 rounded border-input"
                  />
                  {domain.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Session Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened in the session?"
              className="mt-1 w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Achievements to Celebrate</label>
            <textarea
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="Any wins or achievements?"
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Next Session Plan</label>
            <textarea
              value={nextPlan}
              onChange={(e) => setNextPlan(e.target.value)}
              placeholder="What's the plan for next time?"
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Next Session Date</label>
            <Input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Log Session</Button>
        </div>
      </div>
    </div>
  );
}