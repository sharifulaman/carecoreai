import { Button } from "@/components/ui/button";
import { ChevronDown, Edit2 } from "lucide-react";

export default function DomainCard({ domain, section, isExpanded, onToggle, onUpdateSkill }) {
  const skills = section?.skills || [];
  const achieved = skills.filter(s => s.status === "achieved").length;
  const developing = skills.filter(s => s.status === "developing").length;
  const notStarted = skills.filter(s => !s.status || s.status === "not_started").length;
  
  const score = skills.length > 0 ? Math.round((achieved / skills.length) * 100) : 0;
  
  const getStatusLabel = (score) => {
    if (score === 100) return "Achieved";
    if (score >= 60) return "Progressing";
    if (score > 0) return "Developing";
    return "Not Started";
  };

  return (
    <div className="border border-border rounded-lg p-4">
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center justify-between gap-3 pb-3 border-b border-border/50 hover:opacity-70 transition"
      >
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{domain.name}</h4>
          <div className="mt-2 space-y-1">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${score}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{score}% — {getStatusLabel(score)}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          <div className="text-xs text-muted-foreground mb-3">
            {achieved} achieved • {developing} developing • {notStarted} not started
          </div>
          {skills.map((skill) => (
            <div key={skill.name} className="bg-muted/30 rounded p-2 flex items-center justify-between text-xs">
              <div className="flex-1">
                <p className="font-medium">{skill.name}</p>
                {skill.status && (
                  <p className="text-muted-foreground capitalize">{skill.status}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdateSkill(skill)}
                className="gap-1"
              >
                <Edit2 className="w-3 h-3" /> Update
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}