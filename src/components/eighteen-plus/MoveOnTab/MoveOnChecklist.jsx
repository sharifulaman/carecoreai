import { Checkbox } from "@/components/ui/checkbox";

export default function MoveOnChecklist({ stage, checklist, plan }) {
  // Simple checkmark for now - can be expanded with full updates later
  return (
    <div className="bg-muted/20 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-4 capitalize">{stage?.replace(/_/g, " ")} Checklist</h3>
      <div className="space-y-2">
        {checklist.map((item, i) => (
          <label key={i} className="flex items-start gap-3 text-sm cursor-pointer hover:opacity-70">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-input mt-0.5"
              disabled
              defaultChecked={false}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}