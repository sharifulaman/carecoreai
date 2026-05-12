import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function MultiSelectField({ label, options, selected = [], onChange }) {
  const toggle = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm border transition-all",
              selected.includes(option)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}