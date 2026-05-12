import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import MultiSelectField from "./MultiSelectField";

const visitTypes = [
  "In-person at placement", "In-person in community", "In-person at college",
  "Phone call only", "SMS/WhatsApp only", "Visit attempted — resident not present", "Mixed in-person and remote"
];
const presentations = [
  "Happy and healthy", "Calm and settled", "Talkative and engaged",
  "Worried or anxious", "Distressed", "Unwell"
];
const placementConditions = [
  "Clean and tidy", "Slightly untidy", "Untidy — required cleaning",
  "Communal areas acceptable, room needs improvement"
];
const primaryPurposes = [
  "General wellbeing check", "College support and attendance", "Appointment support",
  "Housing and 18+ planning", "Independence and life skills", "Shopping and budgeting",
  "Technology support", "Incident and urgent support", "Move-in or move support", "Multiple purposes"
];
const collegeStatuses = [
  "Attended today", "On the way to college", "Missed college today", "College closed", "Not discussed"
];
const lifeSkillsOptions = [
  "Cooking", "Budgeting", "Cleaning", "Laundry", "Travel", "Online safety",
  "Health management", "Job searching", "Tenancy management", "Social skills"
];
const liaisonOptions = [
  "Social worker", "PA", "IRO", "College", "GP", "Dentist",
  "Job Centre", "Police", "Housing", "Family"
];
const voiceOptions = [
  "Yes — all positive", "Yes — mixed or concern noted", "No — declined", "No — not appropriate today"
];
const cleaningActionOptions = [
  "Praised the standard", "Discussed responsibility and teamwork", "Agreed a plan to clean tomorrow",
  "Not applicable", "Requested you clean with other young people", "Requested you clean your space"
];
const householdSuppliesOptions = [
  "Food storage issue discussed", "Washing liquid/powder needed", "Bin bags needed",
  "Cleaning products needed", "None raised", "Other (add below)"
];
const collegeDiscussionOptions = [
  "Attendance expectations", "Bursary / student services", "Forms/letters (bank/Job Centre/college)",
  "Not discussed", "Progress in class / confidence", "Transfer/assessment at another college", "Travel routes / buses"
];

export default function VisitReportKPIForm({ kpiData, onChange, residents, homes, onGenerate, generating, isAdmin }) {
  const update = (field, value) => onChange({ ...kpiData, [field]: value });

  // Fetch dynamic KPI options if admin
  const { data: kpiOptions = [] } = useQuery({
    queryKey: ["kpi-options"],
    queryFn: () => base44.entities.KPIOption.filter({ org_id: ORG_ID, active: true }),
    enabled: isAdmin,
  });

  // Calculate duration
  const calculateDuration = () => {
    if (!kpiData.time_start || !kpiData.time_end) return null;
    const [sh, sm] = kpiData.time_start.split(":").map(Number);
    const [eh, em] = kpiData.time_end.split(":").map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const duration = calculateDuration();
  const durationDisplay = duration ? `${duration} min` : "–";

  // Get options by category
  const getOptions = (category) => {
    if (isAdmin && kpiOptions.length > 0) {
      return kpiOptions.filter(o => o.category === category).sort((a, b) => a.order - b.order).map(o => o.value);
    }
    // Fallback to static options
    const staticOptions = {
      visit_type: visitTypes,
      presentation: presentations,
      placement_condition: placementConditions,
      primary_purpose: primaryPurposes,
      college_status: collegeStatuses,
      life_skills: lifeSkillsOptions,
      liaison: liaisonOptions,
    };
    return staticOptions[category] || [];
  };

  // When a home is selected, clear child/resident if they don't belong to that home
  const handleHomeChange = (homeId) => {
    const stillValid = residents.find(r => r.id === kpiData.resident_id && r.home_id === homeId);
    onChange({ ...kpiData, home_id: homeId, resident_id: stillValid ? kpiData.resident_id : "" });
  };

  const residentsForHome = kpiData.home_id
    ? residents.filter(r => r.home_id === kpiData.home_id)
    : residents;

  return (
    <div className="space-y-8">
      {/* Section 1 - Basics */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg border-b border-border pb-3">Basics</h2>
        
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-1">
            <Label>Residence / Home</Label>
            <NativeSelect value={kpiData.home_id || ""} onValueChange={handleHomeChange} placeholder="Select home">
              {(homes || []).map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </NativeSelect>
          </div>
          <div className="sm:col-span-1">
            <Label>Child / Young Person</Label>
            <NativeSelect value={kpiData.resident_id} onValueChange={v => update("resident_id", v)} disabled={!kpiData.home_id && (homes || []).length > 0} placeholder={kpiData.home_id ? "Select resident" : "Select home first"}>
              {residentsForHome.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </NativeSelect>
          </div>
          <div className="sm:col-span-1">
            <Label>Date</Label>
            <Input type="date" value={kpiData.date} onChange={e => update("date", e.target.value)} className="mt-1.5" />
          </div>
          <div className="sm:col-span-1">
            <Label>Time of Contact</Label>
            <NativeSelect value={kpiData.time_of_contact} onValueChange={v => update("time_of_contact", v)} placeholder="Select">
              {["Morning", "Afternoon", "Evening", "Night", "Multiple contacts"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </NativeSelect>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Time Start</Label>
            <Input type="time" value={kpiData.time_start} onChange={e => update("time_start", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Time End</Label>
            <Input type="time" value={kpiData.time_end} onChange={e => update("time_end", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Duration</Label>
            <div className="mt-1.5 h-9 rounded-md border border-input bg-muted/30 flex items-center px-3 text-sm font-medium text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" /> {durationDisplay}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <Label>Visit Type</Label>
            <NativeSelect value={kpiData.visit_type} onValueChange={v => update("visit_type", v)} placeholder="Select">
              {visitTypes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </NativeSelect>
          </div>
          <div>
            <Label>Location Summary</Label>
            <NativeSelect value={kpiData.location_summary} onValueChange={v => update("location_summary", v)} placeholder="Select">
              {["Placement only", "College only", "Placement + College", "Placement + Appointment", "Placement + Shopping", "College + Appointment", "Multiple stops", "Other"].map(o =>
                <SelectItem key={o} value={o}>{o}</SelectItem>
              )}
            </NativeSelect>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Checkbox
              id="key-worker-session"
              checked={kpiData.is_key_worker_session || false}
              onCheckedChange={v => update("is_key_worker_session", v)}
            />
            <Label htmlFor="key-worker-session" className="text-sm font-normal cursor-pointer">
              This is a key worker session (will not appear in generated report)
            </Label>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 border border-teal-200 dark:bg-teal-900/20 dark:border-teal-800">
            <Checkbox
              id="daily-summary"
              checked={kpiData.is_daily_summary || false}
              onCheckedChange={v => update("is_daily_summary", v)}
            />
            <Label htmlFor="daily-summary" className="text-sm font-normal cursor-pointer text-teal-800 dark:text-teal-200">
              Mark as Daily Summary (report will also appear under the Daily Summary tab)
            </Label>
          </div>
        </div>
      </section>

      {/* Section 2 - Presentation */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg border-b border-border pb-3">Presentation & Placement</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>How Resident Presented</Label>
            <NativeSelect value={kpiData.presentation} onValueChange={v => update("presentation", v)} placeholder="Select">
              {presentations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </NativeSelect>
          </div>
          <div>
            <Label>Placement Condition</Label>
            <NativeSelect value={kpiData.placement_condition} onValueChange={v => update("placement_condition", v)} placeholder="Select">
              {placementConditions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </NativeSelect>
          </div>
          <div>
            <Label>Fire Safety Check Completed</Label>
            <NativeSelect value={kpiData.fire_check} onValueChange={v => update("fire_check", v)} placeholder="Select">
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </NativeSelect>
          </div>
          <div>
            <Label>Cleaning Action</Label>
            <NativeSelect value={kpiData.cleaning_action} onValueChange={v => update("cleaning_action", v)} placeholder="Select">
              {cleaningActionOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </NativeSelect>
          </div>
        </div>

        <div>
          <Label>Household Notes</Label>
          <Textarea value={kpiData.household_notes} onChange={e => update("household_notes", e.target.value)} placeholder="Any household observations..." className="mt-1.5" />
        </div>

        <MultiSelectField
          label="Household Supplies"
          options={householdSuppliesOptions}
          selected={kpiData.supplies_needed}
          onChange={v => update("supplies_needed", v)}
        />
      </section>

      {/* Section 3 - Main Activity */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg border-b border-border pb-3">Main Activity</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label>Primary Purpose</Label>
            <NativeSelect value={kpiData.primary_purpose} onValueChange={v => update("primary_purpose", v)} placeholder="Select">
              {primaryPurposes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </NativeSelect>
          </div>
          <div>
            <Label>College Status</Label>
            <NativeSelect value={kpiData.college_status} onValueChange={v => update("college_status", v)} placeholder="Select">
              {collegeStatuses.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </NativeSelect>
          </div>
          <div>
            <Label>Appointment Type</Label>
            <NativeSelect value={kpiData.appointment_type} onValueChange={v => update("appointment_type", v)} placeholder="Select or N/A">
              {["None", "GP", "Dentist", "Optician", "Health assessment", "Vaccination", "TB clinic", "Solicitor", "Job Centre and UC", "PEP meeting", "PA meeting", "CAMHS", "Sexual health", "Other"].map(o =>
                <SelectItem key={o} value={o}>{o}</SelectItem>
              )}
            </NativeSelect>
          </div>
        </div>

        <MultiSelectField
          label="College Discussion (multi-select)"
          options={collegeDiscussionOptions}
          selected={kpiData.college_discussion}
          onChange={v => update("college_discussion", v)}
        />

        <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-border mt-4">
          <div>
            <Label>Type of Appointment</Label>
            <NativeSelect value={kpiData.appointment_details_type || ""} onValueChange={v => update("appointment_details_type", v)} placeholder="Select if applicable">
              <SelectItem value="GP Appointment">GP Appointment</SelectItem>
              <SelectItem value="Blood Test">Blood Test</SelectItem>
              <SelectItem value="Urine Test">Urine Test</SelectItem>
              <SelectItem value="ECG">ECG</SelectItem>
              <SelectItem value="Weight Check">Weight Check</SelectItem>
              <SelectItem value="Blood Pressure Check">Blood Pressure Check</SelectItem>
              <SelectItem value="Vision Test">Vision Test</SelectItem>
              <SelectItem value="Hearing Test">Hearing Test</SelectItem>
              <SelectItem value="Dental Check">Dental Check</SelectItem>
              <SelectItem value="Mental Health Review">Mental Health Review</SelectItem>
              <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
              <SelectItem value="Vaccination">Vaccination</SelectItem>
            </NativeSelect>
          </div>

          {kpiData.appointment_details_type && (
            <div>
              <Label>Appointment Notes</Label>
              <Textarea
                value={kpiData.appointment_details_notes || ""}
                onChange={e => update("appointment_details_notes", e.target.value)}
                placeholder="Any relevant notes about this appointment"
                className="mt-1.5"
              />
            </div>
          )}
        </div>
      </section>

      {/* Section 4 - Support & Liaison */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg border-b border-border pb-3">Support & Liaison</h2>

        <MultiSelectField
          label="Independence & Life Skills Covered"
          options={lifeSkillsOptions}
          selected={kpiData.life_skills}
          onChange={v => update("life_skills", v)}
        />

        <MultiSelectField
          label="Liaison Completed With"
          options={liaisonOptions}
          selected={kpiData.liaison}
          onChange={v => update("liaison", v)}
        />

        <div>
          <Label>Liaison Notes</Label>
          <Textarea value={kpiData.liaison_notes} onChange={e => update("liaison_notes", e.target.value)} placeholder="Details of liaison..." className="mt-1.5" />
        </div>

        <div>
          <Label>Custom Action / Notes</Label>
          <Textarea value={kpiData.custom_action} onChange={e => update("custom_action", e.target.value)} placeholder="Anything not covered above..." className="mt-1.5" />
        </div>
      </section>

      {/* Section 5 - Resident Voice */}
      <section className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="font-semibold text-lg border-b border-border pb-3">Resident Voice</h2>

        <div>
          <Label>Resident Voice Survey</Label>
          <NativeSelect value={kpiData.resident_voice} onValueChange={v => update("resident_voice", v)} placeholder="Select">
            {voiceOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </NativeSelect>
        </div>

        {kpiData.resident_voice === "Yes — mixed or concern noted" && (
          <div>
            <Label>Concern Detail</Label>
            <Textarea value={kpiData.voice_concern_detail} onChange={e => update("voice_concern_detail", e.target.value)} placeholder="Describe the concern..." className="mt-1.5" />
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Engagement Level (1–5)</Label>
            <NativeSelect value={kpiData.engagement_level} onValueChange={v => update("engagement_level", v)} placeholder="Select">
              {getOptions("engagement_level").length > 0 
                ? getOptions("engagement_level").map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)
                : ["1", "2", "3", "4", "5"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)
              }
            </NativeSelect>
          </div>
          <div>
            <Label>Risk Level Assessment</Label>
            <NativeSelect value={kpiData.risk_level_assessment} onValueChange={v => update("risk_level_assessment", v)} placeholder="Select">
              {getOptions("risk_level").length > 0 
                ? getOptions("risk_level").map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)
                : ["Low", "Medium", "High"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)
              }
            </NativeSelect>
          </div>
          <div>
            <Label>Independence Progress</Label>
            <NativeSelect value={kpiData.independence_progress} onValueChange={v => update("independence_progress", v)} placeholder="Select">
              {getOptions("independence_progress").length > 0 
                ? getOptions("independence_progress").map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)
                : ["Progressing", "Maintaining", "Declining", "First contact — no baseline"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)
              }
            </NativeSelect>
          </div>
          <div>
            <Label>Health Appointment Adherence</Label>
            <NativeSelect value={kpiData.health_adherence} onValueChange={v => update("health_adherence", v)} placeholder="Select">
              {getOptions("health_adherence").length > 0 
                ? getOptions("health_adherence").map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)
                : ["All up to date", "One or more overdue", "Declined", "Not assessed today"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)
              }
            </NativeSelect>
          </div>
        </div>
      </section>



      {/* Generate Button */}
      <div className="flex justify-end">
        <Button
          onClick={onGenerate}
          disabled={generating || !kpiData.resident_id || !kpiData.date}
          size="lg"
          className="gap-2 rounded-xl px-8 font-semibold"
          style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {generating ? "Generating Report..." : "Generate AI Report"}
        </Button>
      </div>
    </div>
  );
}