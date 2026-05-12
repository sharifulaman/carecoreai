import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Smile, Meh, Frown, ThumbsUp, Heart, MessageSquare, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const moods = [
  { value: 1, icon: Frown, label: "Not great", color: "text-red-500 bg-red-500/10 border-red-500/20" },
  { value: 2, icon: Frown, label: "A bit low", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { value: 3, icon: Meh, label: "Okay", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  { value: 4, icon: Smile, label: "Good", color: "text-green-500 bg-green-500/10 border-green-500/20" },
  { value: 5, icon: ThumbsUp, label: "Great!", color: "text-primary bg-primary/10 border-primary/20" },
];

export default function ResidentPortal() {
  const { user } = useOutletContext();
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodSubmitted, setMoodSubmitted] = useState(false);

  const handleMoodSubmit = () => {
    setMoodSubmitted(true);
  };

  const name = user?.full_name?.split(" ")[0] || "there";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-8">
        <h1 className="text-2xl font-bold">Hello {name}! 👋</h1>
        <p className="text-muted-foreground mt-1">Here's your day.</p>
      </div>

      {/* Mood Check */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          How are you feeling today?
        </h2>
        {moodSubmitted ? (
          <div className="text-center py-4">
            <p className="text-green-500 font-medium">Thanks for sharing! ✓</p>
          </div>
        ) : (
          <div>
            <div className="flex justify-center gap-3 mb-4">
              {moods.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    onClick={() => setSelectedMood(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                      selectedMood === m.value ? m.color : "border-transparent hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("w-8 h-8", selectedMood === m.value ? "" : "text-muted-foreground")} />
                    <span className="text-xs">{m.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedMood && (
              <Button onClick={handleMoodSubmit} className="w-full rounded-xl">
                Submit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Upcoming Appointments
        </h2>
        <p className="text-sm text-muted-foreground">No upcoming appointments scheduled.</p>
      </div>

      {/* Goals */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Your Goals
        </h2>
        <p className="text-sm text-muted-foreground">Your key worker will share your goals from your next session.</p>
      </div>

      {/* Message Key Worker */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Message Your Key Worker
        </h2>
        <Button variant="outline" className="w-full rounded-xl">
          Send a Message
        </Button>
      </div>
    </div>
  );
}