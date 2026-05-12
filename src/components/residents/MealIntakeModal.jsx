import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { createNotification } from "@/lib/createNotification";

const MEAL_OPTIONS = [
  "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner", "Evening Snack"
];

const FOOD_OPTIONS = [
  "Toast", "Cereal", "Porridge", "Eggs", "Fruit", "Sandwich", "Salad",
  "Soup", "Pasta", "Rice", "Chicken", "Fish", "Vegetables", "Yoghurt",
  "Pizza", "Burger", "Hot meal", "Takeaway", "Snacks", "Biscuits", "Drink only"
];

export default function MealIntakeModal({ resident, user, existingLog, onClose }) {
  const qc = useQueryClient();
  const now = new Date();
  const defaultDatetime = now.toISOString().slice(0, 16);

  const [meal, setMeal] = useState(existingLog?.content?.meal || "");
  const [mealInput, setMealInput] = useState(existingLog?.content?.meal || "");
  const [consumed, setConsumed] = useState(existingLog?.content?.consumed || "");
  const [consumedInput, setConsumedInput] = useState(existingLog?.content?.consumed || "");
  const [datetime, setDatetime] = useState(existingLog?.content?.datetime || defaultDatetime);
  const [notes, setNotes] = useState(existingLog?.content?.notes || "");
  const [showMealOptions, setShowMealOptions] = useState(false);
  const [showFoodOptions, setShowFoodOptions] = useState(false);

  // Allergies from resident record (if stored)
  const allergies = resident?.allergies || null;

  const create = useMutation({
    mutationFn: (data) => secureGateway.create("DailyLog", data),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ["all-daily-logs"] });
      qc.invalidateQueries({ queryKey: ["daily-logs-recent"] });
      toast.success("Meal recorded");
      if (payload.flagged) {
        secureGateway.filter("Home", { id: payload.home_id }).then(homes => {
          const home = homes[0];
          secureGateway.filter("StaffProfile").then(allStaff => {
            const tl = home?.team_leader_id ? allStaff.find(s => s.id === home.team_leader_id) : null;
            const admin = allStaff.find(s => s.role === "admin");
            const msg = `A flagged daily log has been submitted for ${payload.resident_name} by ${payload.worker_name} on ${payload.date}. Please review.`;
            if (tl?.user_id) createNotification({ recipient_user_id: tl.user_id, recipient_staff_id: tl.id, title: "Flagged Log — Action Required", body: msg, type: "flagged_log", link: "/residents?tab=yp-cards", priority: "high" });
            if (admin?.user_id && admin.id !== tl?.id) createNotification({ recipient_user_id: admin.user_id, recipient_staff_id: admin.id, title: "Flagged Log — Action Required", body: msg, type: "flagged_log", link: "/residents?tab=yp-cards", priority: "high" });
          }).catch(() => {});
        }).catch(() => {});
      }
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => secureGateway.update("DailyLog", id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-daily-logs"] });
      qc.invalidateQueries({ queryKey: ["daily-logs-recent"] });
      toast.success("Meal updated");
      onClose();
    },
  });

  const handleSave = () => {
    const finalMeal = mealInput.trim();
    const finalConsumed = consumedInput.trim();
    if (!finalMeal) { toast.error("Please enter a meal"); return; }
    if (!finalConsumed) { toast.error("Please enter what was offered/consumed"); return; }

    const dateStr = datetime.split("T")[0];
    const payload = {
      org_id: ORG_ID,
      resident_id: resident.id,
      resident_name: resident.display_name,
      worker_id: user?.email,
      worker_name: user?.full_name,
      home_id: resident.home_id,
      date: dateStr,
      shift: "morning",
      flags: ["meal_intake"],
      content: {
        meal: finalMeal,
        consumed: finalConsumed,
        datetime,
        notes,
      },
    };

    if (existingLog) update.mutate({ id: existingLog.id, data: payload });
    else create.mutate(payload);
  };

  const fmtDisplay = (dt) => {
    if (!dt) return "";
    return new Date(dt).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const isPending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">Add Meal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Allergies */}
        <div>
          <p className="text-sm font-medium mb-2">Allergies</p>
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground">
            {allergies || "No Allergies"}
          </span>
        </div>

        {/* Meal */}
        <div className="relative">
          <p className="text-sm font-medium mb-2">Meal <span className="text-red-500">*</span></p>
          <Input
            placeholder="Enter or select meal"
            value={mealInput}
            onChange={e => { setMealInput(e.target.value); setShowMealOptions(true); }}
            onFocus={() => setShowMealOptions(true)}
            onBlur={() => setTimeout(() => setShowMealOptions(false), 150)}
            className="text-sm"
          />
          {showMealOptions && (
            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
              {MEAL_OPTIONS.filter(o => o.toLowerCase().includes(mealInput.toLowerCase())).map(o => (
                <button
                  key={o}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onMouseDown={() => { setMealInput(o); setMeal(o); setShowMealOptions(false); }}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* What was Offered/Consumed */}
        <div className="relative">
          <p className="text-sm font-medium mb-2">What was Offered/Consumed? <span className="text-red-500">*</span></p>
          <div className="relative">
            <Input
              placeholder="Enter food item"
              value={consumedInput}
              onChange={e => { setConsumedInput(e.target.value); setShowFoodOptions(true); }}
              onFocus={() => setShowFoodOptions(true)}
              onBlur={() => setTimeout(() => setShowFoodOptions(false), 150)}
              className="text-sm pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▾</span>
          </div>
          {showFoodOptions && (
            <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
              {FOOD_OPTIONS.filter(o => o.toLowerCase().includes(consumedInput.toLowerCase())).map(o => (
                <button
                  key={o}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onMouseDown={() => { setConsumedInput(o); setConsumed(o); setShowFoodOptions(false); }}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time Offered/Consumed */}
        <div>
          <p className="text-sm font-medium mb-2">Time Offered/Consumed <span className="text-red-500">*</span></p>
          <input
            type="datetime-local"
            value={datetime}
            onChange={e => setDatetime(e.target.value)}
            className="w-full h-10 px-3 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {datetime && (
            <p className="text-xs text-muted-foreground mt-1">{fmtDisplay(datetime)}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-medium mb-2">Notes</p>
          <Textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes..."
            className="text-sm resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" className="rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleSave}
            disabled={isPending}
          >
            Add Meal
          </Button>
        </div>
      </div>
    </div>
  );
}