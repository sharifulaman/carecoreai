import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import { X, Eye, EyeOff, Info } from "lucide-react";
import { ORG_ID, ROLE_LABELS } from "@/lib/roleConfig";
import PhotoUpload from "./PhotoUpload";

const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter(r => !["resident", "external", "guest"].includes(r));

export default function StaffForm({ homes, teamLeaders = [], onSubmit, onClose, saving }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    role: "",
    phone: "",
    dbs_number: "",
    dbs_expiry: "",
    start_date: "",
    end_date: "",
    status: "pending",
    is_support_role: "",
    working_time_opt_out: false,
    employment_type: "",
    home_ids: [],
    assigned_accommodation_categories: [],
    org_id: ORG_ID,
    team_leader_id: "",
    photo_url: "",
    employee_id: "",
    pay_frequency: "",
    annual_salary: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (k, v) => {
    setForm(f => {
      const newForm = { ...f, [k]: v };
      
      setErrors(e => {
        const newErrors = { ...e, [k]: undefined };
        
        // Live validation for passwords
        if (k === "password" || k === "confirm_password") {
          if (newForm.password) {
            if (newForm.password.length < 8) newErrors.password = "Password must be at least 8 characters";
            else delete newErrors.password;
            
            if (newForm.confirm_password && newForm.password !== newForm.confirm_password) {
              newErrors.confirm_password = "Passwords do not match";
            } else if (newForm.password === newForm.confirm_password) {
              delete newErrors.confirm_password;
            }
          } else {
            delete newErrors.password;
            delete newErrors.confirm_password;
          }
        }
        return newErrors;
      });

      return newForm;
    });
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name?.trim()) errs.full_name = "Full name is required";
    else if (form.full_name.trim().length < 2) errs.full_name = "Name must be at least 2 characters";
    if (!form.role) errs.role = "Role is required";
    if (!form.phone?.trim()) errs.phone = "Phone number is required";
    else if (!/^[\d\s\+\-\(\)]{7,20}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "Please enter a valid phone number";
    if (!form.start_date) errs.start_date = "Start date is required";
    else if (new Date(form.start_date) > new Date()) errs.start_date = "Start date cannot be in the future";
    if (!form.employment_type) errs.employment_type = "Employment type is required";
    if (form.role === "support_worker" && !form.team_leader_id) errs.team_leader_id = "Team leader is required for support workers";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Please enter a valid email address";
    if (!form.dbs_number?.trim()) errs.dbs_number = "DBS number is required";
    if (!form.dbs_expiry) errs.dbs_expiry = "DBS expiry date is required";
    else {
      const today = new Date(); today.setHours(0,0,0,0);
      if (new Date(form.dbs_expiry) < today) errs.dbs_expiry = "DBS has already expired";
    }
    if (form.password) {
      if (!form.email?.trim()) errs.email = "Email is required when setting a password";
      if (form.password.length < 8) errs.password = "Password must be at least 8 characters";
      if (form.password !== form.confirm_password) errs.confirm_password = "Passwords do not match";
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the errors before saving");
      return;
    }

    const payload = { ...form };
    payload.annual_salary = payload.annual_salary ? parseFloat(payload.annual_salary) : 0;
    payload.is_support_role = Boolean(form.is_support_role);
    payload.working_time_opt_out = Boolean(form.working_time_opt_out);
    
    // Backend expects null for empty dates, not empty strings
    if (!payload.dbs_expiry) payload.dbs_expiry = null;
    if (!payload.end_date) payload.end_date = null;
    if (!payload.start_date) payload.start_date = null;

    delete payload.confirm_password; // Don't send this

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Add Staff Member</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <PhotoUpload
              currentUrl={form.photo_url}
              onUploaded={url => update("photo_url", url)}
              size="lg"
            />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">Profile Photo</p>
              <p>JPG, PNG, WEBP — max 5MB</p>
            </div>
          </div>
          <div>
            <Label>Full Name *</Label>
            <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} className={`mt-1.5 ${errors.full_name ? "border-destructive" : ""}`} />
            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email{form.password ? " *" : ""}</Label>
              <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} className={`mt-1.5 ${errors.email ? "border-destructive" : ""}`} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label>Staff ID </Label>
              <Input value={form.employee_id} onChange={e => update("employee_id", e.target.value)} className="mt-1.5" placeholder="e.g. EMP-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Password</Label>
              <div className="relative mt-1.5">
                <Input type={showPassword ? "text" : "password"} value={form.password} onChange={e => update("password", e.target.value)} className={`pr-10 ${errors.password ? "border-destructive" : ""}`} placeholder="Leave blank to skip" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label>Confirm Password</Label>
              <div className="relative mt-1.5">
                <Input type={showConfirmPassword ? "text" : "password"} value={form.confirm_password} onChange={e => update("confirm_password", e.target.value)} className={`pr-10 ${errors.confirm_password ? "border-destructive" : ""}`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && <p className="text-xs text-destructive mt-1">{errors.confirm_password}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Role *</Label>
              <NativeSelect value={form.role} onValueChange={v => update("role", v)} placeholder="Select role..." className={errors.role ? "border-destructive" : ""}>
                {ASSIGNABLE_ROLES.map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </NativeSelect>
              {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={e => update("phone", e.target.value)} className={`mt-1.5 ${errors.phone ? "border-destructive" : ""}`} placeholder="e.g. 07700 900000" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>DBS Number *</Label>
              <Input value={form.dbs_number} onChange={e => update("dbs_number", e.target.value)} className={`mt-1.5 ${errors.dbs_number ? "border-destructive" : ""}`} />
              {errors.dbs_number && <p className="text-xs text-destructive mt-1">{errors.dbs_number}</p>}
            </div>
            <div>
              <Label>DBS Expiry *</Label>
              <Input type="date" value={form.dbs_expiry} onChange={e => update("dbs_expiry", e.target.value)} className={`mt-1.5 ${errors.dbs_expiry ? "border-destructive" : ""}`} min={new Date().toISOString().split("T")[0]} />
              {errors.dbs_expiry && <p className="text-xs text-destructive mt-1">{errors.dbs_expiry}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)} className={`mt-1.5 ${errors.start_date ? "border-destructive" : ""}`} max={new Date().toISOString().split("T")[0]} />
              {errors.start_date && <p className="text-xs text-destructive mt-1">{errors.start_date}</p>}
            </div>
            <div>
              <Label>Leave Date</Label>
              <Input type="date" value={form.end_date} onChange={e => update("end_date", e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div>
            <Label>Employment Type *</Label>
            <NativeSelect value={form.employment_type} onValueChange={v => update("employment_type", v)} placeholder="Select employment type..." className={errors.employment_type ? "border-destructive" : ""}>
              <SelectItem value="permanent">Permanent</SelectItem>
              <SelectItem value="agency">Agency</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
              <SelectItem value="temporary">Temporary</SelectItem>
            </NativeSelect>
            {errors.employment_type && <p className="text-xs text-destructive mt-1">{errors.employment_type}</p>}
          </div>

          <div className="flex items-center gap-6 h-full pt-4">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.is_support_role)}
                onChange={e => update("is_support_role", e.target.checked)}
                className="w-4 h-4 text-primary rounded border-input cursor-pointer"
              />
              Is this a support role?
            </label>

            <label className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.working_time_opt_out)}
                onChange={e => update("working_time_opt_out", e.target.checked)}
                className="w-4 h-4 text-primary rounded border-input cursor-pointer"
              />
              WTR Opt-Out
              <span
                title="Working Time Regulations 1998: staff are capped at an average 48-hour working week unless they voluntarily opt out in writing. Tick this if the staff member has signed an opt-out agreement."
                className="inline-flex"
              >
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
            </label>
          </div>

          {form.role === "support_worker" && (
            <div>
              <Label>Team Leader *</Label>
              <NativeSelect value={form.team_leader_id} onValueChange={v => update("team_leader_id", v)} placeholder="Select team leader..." className={errors.team_leader_id ? "border-destructive" : ""}>
                {teamLeaders.map(tl => <SelectItem key={tl.id} value={tl.id}>{tl.full_name}</SelectItem>)}
              </NativeSelect>
              {errors.team_leader_id && <p className="text-xs text-destructive mt-1">{errors.team_leader_id}</p>}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}