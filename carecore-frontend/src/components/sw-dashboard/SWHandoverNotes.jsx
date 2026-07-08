import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function SWHandoverNotes({ residents }) {
  const navigate = useNavigate();
  // Mock recent notes - in production would fetch actual handover/visit notes
  const recentNotes = useMemo(() => {
    return residents.slice(0, 3).map((r, i) => ({
      id: i,
      author: "Support Worker",
      initials: "SW",
      date: new Date(Date.now() - Math.random() * 48 * 60 * 60 * 1000).toLocaleDateString(),
      time: "16:30",
      note: [
        "Shanto doing well today. Good mood and engaged in cooking session. Attended school. No concerns.",
        "Support session around college choices. Feeling anxious but motivated. Follow up tomorrow.",
        "Job centre visit completed. CV updated. Awaiting response from employer. Positive progress.",
      ][i],
      resident: r.display_name,
    }));
  }, [residents]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Recent Notes / Handover</h3>
          <p className="text-xs text-muted-foreground mt-1">{recentNotes.length} recent notes</p>
        </div>
        <a href="/residents?tab=notes" className="text-xs text-primary hover:underline">View all</a>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {recentNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent notes</p>
        ) : (
          recentNotes.map((note) => (
            <div key={note.id} className="border border-border rounded p-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {note.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">{note.author}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{note.date} {note.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{note.resident}</p>
                </div>
              </div>
              <p className="text-xs text-foreground leading-relaxed">{note.note}</p>
            </div>
          ))
        )}
      </div>

      <button 
        onClick={() => navigate("/residents?tab=visits")}
        className="w-full flex items-center justify-center gap-2 text-xs font-medium text-primary hover:underline py-2"
      >
        <Plus className="w-3 h-3" /> Add Note
      </button>
    </div>
  );
}