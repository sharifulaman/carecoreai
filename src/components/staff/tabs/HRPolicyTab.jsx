import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { Save } from "lucide-react";

const DEFAULT_POLICY = {
  annual_leave_days: 28,
  leave_year_start: "04-01",
  max_consecutive_leave_days: 14,
  min_notice_days: 7,
  max_staff_off_per_home: 2,
  carry_over_allowed: true,
  max_carry_over_days: 5,
  sick_leave_trigger: 3,
  probation_months: 6,
  probation_alert_days: 14,
  dbs_renewal_reminder_days: 90,
  dbs_required: true,
  supervision_max_weeks: 8,
  appraisal_max_months: 12,
  supervision_alert_days: 7,
  training_alert_days: 60,
  overtime_threshold_hours: 37.5,
  overtime_rate_multiplier: 1.5,
  sleep_in_allowance: 50,
  on_call_allowance: 25,
  pension_employer_pct: 3,
  pension_employee_pct: 5,
  default_tax_code: "1257L",
  require_clock_in: true,
  clock_in_grace_minutes: 15,
  auto_clock_out_hours: 13,
  bank_holiday_pay_type: "standard",
  bank_holiday_pay_multiplier: 1.5,
  bank_holiday_toil_hours: 8,
};

function Section({ title, children }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <h3 className="font-semibold text-sm border-b border-border pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function HRPolicyTab() {
  const queryClient = useQueryClient();
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [orgId, setOrgId] = useState(null);

  const { data: orgs = [] } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => base44.entities.Organisation.filter({ org_id: ORG_ID }, "-created_date", 1),
  });

  useEffect(() => {
    if (orgs.length > 0) {
      const org = orgs[0];
      setOrgId(org.id);
      if (org.hr_policy) {
        setPolicy({ ...DEFAULT_POLICY, ...org.hr_policy });
      }
    }
  }, [orgs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (orgId) {
        await base44.entities.Organisation.update(orgId, { hr_policy: policy });
      } else {
        await base44.entities.Organisation.create({ org_id: ORG_ID, name: "CareCore AI", hr_policy: policy });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
      toast.success("HR policy saved");
    },
  });

  const set = (key, val) => setPolicy(p => ({ ...p, [key]: val }));
  const num = (key) => (
    <Input type="number" className="w-24 text-right" value={policy[key] ?? ""} onChange={e => set(key, parseFloat(e.target.value) || 0)} />
  );
  const toggle = (key) => (
    <Switch checked={!!policy[key]} onCheckedChange={v => set(key, v)} />
  );
  const text = (key) => (
    <Input className="w-32" value={policy[key] ?? ""} onChange={e => set(key, e.target.value)} />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">HR Policy Settings</h2>
          <p className="text-xs text-muted-foreground">These values are used throughout the HR module.</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
          <Save className="w-3.5 h-3.5" /> {saveMutation.isPending ? "Saving…" : "Save Policy"}
        </Button>
      </div>

      <Section title="Leave Policy">
        <Field label="Annual leave entitlement" hint="Days per year">{num("annual_leave_days")}</Field>
        <Field label="Leave year start" hint="MM-DD format (e.g. 04-01 = 1 April)">{text("leave_year_start")}</Field>
        <Field label="Max consecutive leave days" hint="Before director approval required">{num("max_consecutive_leave_days")}</Field>
        <Field label="Minimum notice period" hint="Days notice required for requests">{num("min_notice_days")}</Field>
        <Field label="Max staff off per home per day" hint="Clash threshold">{num("max_staff_off_per_home")}</Field>
        <Field label="Allow carry-over" hint="Carry unused days to next year">{toggle("carry_over_allowed")}</Field>
        {policy.carry_over_allowed && <Field label="Max carry-over days">{num("max_carry_over_days")}</Field>}
        <Field label="Sick leave trigger" hint="Occurrences in 12 months before Bradford Factor review">{num("sick_leave_trigger")}</Field>
      </Section>

      <Section title="Probation Policy">
        <Field label="Default probation length" hint="Months">{num("probation_months")}</Field>
        <Field label="Alert admin before probation end" hint="Days">{num("probation_alert_days")}</Field>
      </Section>

      <Section title="DBS Policy">
        <Field label="DBS required for all staff">{toggle("dbs_required")}</Field>
        <Field label="DBS renewal reminder" hint="Days before expiry to alert">{num("dbs_renewal_reminder_days")}</Field>
      </Section>

      <Section title="Supervision & Appraisals">
        <Field label="Max weeks between supervisions">{num("supervision_max_weeks")}</Field>
        <Field label="Max months between appraisals">{num("appraisal_max_months")}</Field>
        <Field label="Alert admin days before supervision due">{num("supervision_alert_days")}</Field>
        <Field label="Alert admin days before training expires">{num("training_alert_days")}</Field>
      </Section>

      <Section title="Payroll Policy">
        <Field label="Weekly overtime threshold" hint="Hours before OT applies">{num("overtime_threshold_hours")}</Field>
        <Field label="Overtime rate multiplier" hint="e.g. 1.5 = time and a half">{num("overtime_rate_multiplier")}</Field>
        <Field label="Sleep-in allowance" hint="£ flat rate per sleep-in shift">{num("sleep_in_allowance")}</Field>
        <Field label="On-call allowance" hint="£ flat rate per on-call shift">{num("on_call_allowance")}</Field>
        <Field label="Employer pension contribution %" >{num("pension_employer_pct")}</Field>
        <Field label="Employee pension contribution %">{num("pension_employee_pct")}</Field>
        <Field label="Default tax code">{text("default_tax_code")}</Field>
      </Section>

      <Section title="Clock-In Policy">
        <Field label="Require clock-in for support workers & TLs">{toggle("require_clock_in")}</Field>
        <Field label="Late clock-in grace period" hint="Minutes">{num("clock_in_grace_minutes")}</Field>
        <Field label="Auto clock-out after" hint="Hours (flags for admin review)">{num("auto_clock_out_hours")}</Field>
      </Section>

      <Section title="Bank Holiday Pay Policy">
        <Field label="Bank holiday payment type" hint="How staff are compensated for working bank holidays">
          <select 
            value={policy.bank_holiday_pay_type || "standard"} 
            onChange={e => set("bank_holiday_pay_type", e.target.value)}
            className="h-8 px-2 rounded border border-input text-sm"
          >
            <option value="standard">Standard Pay</option>
            <option value="enhanced">Enhanced Pay (multiplier)</option>
            <option value="toil">TOIL (Time Off In Lieu)</option>
          </select>
        </Field>
        {policy.bank_holiday_pay_type === "enhanced" && (
          <Field label="Enhanced pay multiplier" hint="e.g. 1.5x or 2x">{num("bank_holiday_pay_multiplier")}</Field>
        )}
        {policy.bank_holiday_pay_type === "toil" && (
          <Field label="TOIL hours per bank holiday" hint="Hours credited">{num("bank_holiday_toil_hours")}</Field>
        )}
      </Section>
    </div>
  );
}