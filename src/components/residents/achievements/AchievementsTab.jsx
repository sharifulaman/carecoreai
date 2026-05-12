import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Star, BookOpen, Heart, Users, Trophy, Palette, Lightbulb, MapPin } from "lucide-react";
import { toast } from "sonner";
import AchievementForm from "./AchievementForm";

const CATEGORY_COLORS = {
  education: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", icon: BookOpen },
  health: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", icon: Heart },
  independence: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", icon: Star },
  relationships: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-300", icon: Users },
  sport_activity: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", icon: Trophy },
  creative: { bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-300", icon: Palette },
  personal_growth: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", icon: Lightbulb },
  community: { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-300", icon: MapPin },
  employment: { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-300", icon: Star },
  other: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", icon: Star },
};

export default function AchievementsTab({ residents, homes, staff, user }) {
  const qc = useQueryClient();
  const [selectedResident, setSelectedResident] = useState(residents[0]?.id || null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "timeline"
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");

  const { data: achievements = [] } = useQuery({
    queryKey: ["achievements"],
    queryFn: () => secureGateway.filter("Achievement", { is_deleted: false }, "-achievement_date", 500),
  });

  const resident = residents.find(r => r.id === selectedResident);
  const residentAchievements = achievements
    .filter(a => a.resident_id === selectedResident)
    .filter(a => filterCategory === "all" || a.category === filterCategory)
    .sort((a, b) => (b.achievement_date || "").localeCompare(a.achievement_date || ""));

  const categoryCounts = useMemo(() => {
    const counts = {};
    achievements
      .filter(a => a.resident_id === selectedResident)
      .forEach(a => {
        counts[a.category] = (counts[a.category] || 0) + 1;
      });
    return counts;
  }, [achievements, selectedResident]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">✨ Achievements</h3>
        {residents.length > 1 && (
          <Select value={selectedResident} onValueChange={setSelectedResident}>
            <SelectTrigger className="w-56 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("timeline")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Timeline
          </button>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-1"><Plus className="w-4 h-4" /> Record Achievement</Button>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm text-muted-foreground mb-2">Total achievements: <strong>{residentAchievements.length}</strong></p>
        <div className="flex flex-wrap gap-2">
          {["education", "health", "independence", "relationships", "sport_activity", "creative", "personal_growth", "community", "employment"].map(cat => {
            const count = categoryCounts[cat] || 0;
            if (count === 0) return null;
            const colors = CATEGORY_COLORS[cat];
            const Icon = colors.icon;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all ${
                  filterCategory === cat ? colors.bg + " " + colors.text + " border-current" : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <Icon className="w-3 h-3" /> {cat.replace(/_/g, " ")} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {residentAchievements.length === 0 ? (
            <div className="col-span-full bg-card border border-border rounded-lg p-12 text-center text-muted-foreground text-sm">No achievements recorded yet.</div>
          ) : (
            residentAchievements.map(a => {
              const colors = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.other;
              const Icon = colors.icon;
              return (
                <div key={a.id} className={`rounded-lg border ${colors.border} ${colors.bg} p-4 space-y-2`}>
                  <div className="flex items-start justify-between gap-2">
                    <Icon className={`w-5 h-5 ${colors.text} shrink-0`} />
                    <p className="text-xs text-muted-foreground">{a.achievement_date}</p>
                  </div>
                  <h4 className={`font-semibold text-sm ${colors.text}`}>{a.title}</h4>
                  {a.description && <p className="text-xs text-foreground line-clamp-2">{a.description}</p>}
                  {a.celebrated_how && <p className="text-xs text-muted-foreground italic">Celebrated: {a.celebrated_how}</p>}
                  <div className="flex flex-wrap gap-1 pt-2">
                    {a.shared_with_la && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">LA Shared</span>}
                    {a.shared_with_family && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Family Shared</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Timeline View */}
      {viewMode === "timeline" && (
        <div className="space-y-0">
          {residentAchievements.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground text-sm">No achievements recorded yet.</div>
          ) : (
            residentAchievements.map((a, i) => {
              const colors = CATEGORY_COLORS[a.category] || CATEGORY_COLORS.other;
              const Icon = colors.icon;
              return (
                <div key={a.id} className="flex gap-4 pb-6">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    {i < residentAchievements.length - 1 && <div className="w-0.5 h-12 bg-muted mt-2" />}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-xs font-medium ${colors.text}`}>{a.achievement_date}</p>
                    <h4 className="font-semibold text-sm mt-1">{a.title}</h4>
                    {a.description && <p className="text-sm text-foreground mt-1">{a.description}</p>}
                    {a.celebrated_how && <p className="text-xs text-muted-foreground mt-1 italic">Celebrated: {a.celebrated_how}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {a.shared_with_la && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">LA Shared</span>}
                      {a.shared_with_family && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Family Shared</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal */}
      {showForm && <AchievementForm resident={resident} residents={residents} staff={staff} user={user} onClose={() => setShowForm(false)} onSave={() => { qc.invalidateQueries({ queryKey: ["achievements"] }); setShowForm(false); }} />}
    </div>
  );
}