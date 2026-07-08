import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { secureGateway } from '@/lib/secureGateway';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function VacancyForm({ isOpen, onClose, onSave, vacancy }) {
  const [loading, setLoading] = useState(false);
  const [homes, setHomes] = useState([]);
  const [staff, setStaff] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    vacancy_role: '',
    is_support_role: '',
    home_id: '',
    service_type: '',
    accommodation_category: '',
    number_of_posts: 1,
    employment_type: '',
    contract_hours: '',
    salary_or_hourly_rate: '',
    pay_type: '',
    vacancy_opened_date: new Date().toISOString().split('T')[0],
    target_start_date: '',
    status: 'open',
    reason_for_vacancy: '',
    reason_details: '',
    recruiting_manager_id: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (vacancy) {
        setFormData({
          vacancy_role: vacancy.vacancy_role || '',
          is_support_role: vacancy.is_support_role ? 'true' : 'false',
          home_id: vacancy.home_id || '',
          service_type: vacancy.service_type || '',
          accommodation_category: vacancy.accommodation_category || '',
          number_of_posts: vacancy.number_of_posts || 1,
          employment_type: vacancy.employment_type || '',
          contract_hours: vacancy.contract_hours || '',
          salary_or_hourly_rate: vacancy.salary_or_hourly_rate || '',
          pay_type: vacancy.pay_type || '',
          vacancy_opened_date: vacancy.vacancy_opened_date ? new Date(vacancy.vacancy_opened_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          target_start_date: vacancy.target_start_date ? new Date(vacancy.target_start_date).toISOString().split('T')[0] : '',
          status: vacancy.status || 'open',
          reason_for_vacancy: vacancy.reason_for_vacancy || '',
          reason_details: vacancy.reason_details || '',
          recruiting_manager_id: vacancy.recruiting_manager_id || '',
          notes: vacancy.notes || '',
        });
      } else {
        setFormData({
          vacancy_role: '',
          is_support_role: '',
          home_id: '',
          service_type: '',
          accommodation_category: '',
          number_of_posts: 1,
          employment_type: '',
          contract_hours: '',
          salary_or_hourly_rate: '',
          pay_type: '',
          vacancy_opened_date: new Date().toISOString().split('T')[0],
          target_start_date: '',
          status: 'open',
          reason_for_vacancy: '',
          reason_details: '',
          recruiting_manager_id: '',
          notes: '',
        });
      }
      setErrors({});
    }
  }, [isOpen, vacancy]);

  const fetchData = async () => {
    try {
      const [homesData, staffData] = await Promise.all([
        base44.entities.Home.list(),
        base44.entities.StaffProfile.filter({}),
      ]);
      setHomes(homesData || []);
      setStaff(staffData || []);
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  const update = (key, value) => {
    setFormData(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.vacancy_role?.trim()) errs.vacancy_role = 'Vacancy role is required';
    if (formData.is_support_role === '') errs.is_support_role = 'Please select if this is a support role';
    if (!formData.home_id) errs.home_id = 'Home is required';
    if (!formData.service_type) errs.service_type = 'Service type is required';
    if (!formData.accommodation_category) errs.accommodation_category = 'Accommodation category is required';
    if (!formData.number_of_posts || formData.number_of_posts < 1) errs.number_of_posts = 'Number of posts is required';
    if (!formData.employment_type) errs.employment_type = 'Employment type is required';
    if (!formData.contract_hours) errs.contract_hours = 'Contract hours are required';
    if (!formData.pay_type) errs.pay_type = 'Pay type is required';
    if (!formData.salary_or_hourly_rate) errs.salary_or_hourly_rate = 'Salary/rate is required';
    if (!formData.vacancy_opened_date) errs.vacancy_opened_date = 'Vacancy opened date is required';
    if (!formData.target_start_date) errs.target_start_date = 'Target start date is required';
    if (!formData.reason_for_vacancy) errs.reason_for_vacancy = 'Reason for vacancy is required';
    if (!formData.reason_details?.trim()) errs.reason_details = 'Reason details are required';
    if (!formData.recruiting_manager_id) errs.recruiting_manager_id = 'Recruiting manager is required';
    if (!formData.notes?.trim()) errs.notes = 'Notes are required';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      const selectedHome = homes.find((h) => h.id === formData.home_id);
      const selectedManager = staff.find((s) => s.id === formData.recruiting_manager_id);
      
      const payload = {
        org_id: vacancy?.org_id || "default_org",
        ...formData,
        is_support_role: formData.is_support_role === 'true',
        home_name: selectedHome?.name,
        recruiting_manager_name: selectedManager?.full_name,
        contract_hours: formData.contract_hours ? parseFloat(formData.contract_hours) : undefined,
        number_of_posts: formData.number_of_posts ? parseInt(formData.number_of_posts, 10) : 1,
        salary_or_hourly_rate: formData.salary_or_hourly_rate ? parseFloat(formData.salary_or_hourly_rate) : undefined,
        applications_received: vacancy?.applications_received || 0,
        interviews_scheduled: vacancy?.interviews_scheduled || 0,
      };

      if (vacancy?.id) {
        await secureGateway.update("Vacancy", vacancy.id, payload);
        toast.success("Vacancy updated");
      } else {
        await secureGateway.create("Vacancy", payload);
        toast.success("Vacancy created");
      }
      
      onSave?.();
      onClose();
    } catch (e) {
      console.error('Error saving vacancy:', e);
      toast.error('Failed to save vacancy');
    } finally {
      setLoading(false);
    }
  };

  const err = (field) => errors[field] ? 'border-destructive' : '';
  const selectClass = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background";
  const labelClass = "block text-xs font-semibold text-muted-foreground mb-1.5";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vacancy ? 'Edit Vacancy' : 'Create Vacancy'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className={labelClass}>Vacancy Role *</label>
            <Input value={formData.vacancy_role} onChange={(e) => update('vacancy_role', e.target.value)} placeholder="e.g. Support Worker, Team Leader" className={err('vacancy_role')} />
            {errors.vacancy_role && <p className="text-xs text-destructive mt-1">{errors.vacancy_role}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="support-role"
              checked={formData.is_support_role === 'true'}
              onChange={(e) => update('is_support_role', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="support-role" className="text-sm font-medium">Support role? *</label>
            {errors.is_support_role && <p className="text-xs text-destructive ml-2">{errors.is_support_role}</p>}
          </div>

          <div>
            <label className={labelClass}>Home/Service *</label>
            <select
              value={formData.home_id}
              onChange={(e) => update('home_id', e.target.value)}
              className={`${selectClass} ${err('home_id')}`}
            >
              <option value="">Select home</option>
              {homes.map((home) => <option key={home.id} value={home.id}>{home.name}</option>)}
            </select>
            {errors.home_id && <p className="text-xs text-destructive mt-1">{errors.home_id}</p>}
          </div>

          <div>
            <label className={labelClass}>Accommodation Category *</label>
            <select
              value={formData.accommodation_category}
              onChange={(e) => update('accommodation_category', e.target.value)}
              className={`${selectClass} ${err('accommodation_category')}`}
            >
              <option value="">—</option>
              <option value="self_contained">Self-contained</option>
              <option value="shared_ring_fenced">Shared (Ring-fenced)</option>
              <option value="shared_non_ring_fenced">Shared (Non ring-fenced)</option>
            </select>
            {errors.accommodation_category && <p className="text-xs text-destructive mt-1">{errors.accommodation_category}</p>}
          </div>

          <div>
            <label className={labelClass}>Number of Posts *</label>
            <Input type="number" min="1" value={formData.number_of_posts} onChange={(e) => update('number_of_posts', e.target.value)} className={err('number_of_posts')} placeholder="1" />
            {errors.number_of_posts && <p className="text-xs text-destructive mt-1">{errors.number_of_posts}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Opened Date *</label>
              <input
                type="date"
                value={formData.vacancy_opened_date}
                onChange={(e) => update('vacancy_opened_date', e.target.value)}
                className={`${selectClass} ${err('vacancy_opened_date')}`}
              />
              {errors.vacancy_opened_date && <p className="text-xs text-destructive mt-1">{errors.vacancy_opened_date}</p>}
            </div>
            <div>
              <label className={labelClass}>Target Start Date *</label>
              <input
                type="date"
                value={formData.target_start_date}
                onChange={(e) => update('target_start_date', e.target.value)}
                className={`${selectClass} ${err('target_start_date')}`}
              />
              {errors.target_start_date && <p className="text-xs text-destructive mt-1">{errors.target_start_date}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Employment Type *</label>
            <select
              value={formData.employment_type}
              onChange={(e) => update('employment_type', e.target.value)}
              className={`${selectClass} ${err('employment_type')}`}
            >
              <option value="">Select employment type</option>
              <option value="permanent">Permanent</option>
              <option value="fixed_term">Fixed Term</option>
              <option value="temporary">Temporary</option>
            </select>
            {errors.employment_type && <p className="text-xs text-destructive mt-1">{errors.employment_type}</p>}
          </div>

          <div>
            <label className={labelClass}>Service Type *</label>
            <select
              value={formData.service_type}
              onChange={(e) => update('service_type', e.target.value)}
              className={`${selectClass} ${err('service_type')}`}
            >
              <option value="">Select service type</option>
              <option value="outreach">Outreach</option>
              <option value="eighteen_plus">18+ Support</option>
              <option value="twenty_four_hours">24 Hours</option>
            </select>
            {errors.service_type && <p className="text-xs text-destructive mt-1">{errors.service_type}</p>}
          </div>

          <div>
            <label className={labelClass}>Contracted Hours per Week *</label>
            <Input type="number" step="0.5" value={formData.contract_hours} onChange={(e) => update('contract_hours', e.target.value)} className={err('contract_hours')} />
            {errors.contract_hours && <p className="text-xs text-destructive mt-1">{errors.contract_hours}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Pay Type *</label>
              <select
                value={formData.pay_type}
                onChange={(e) => update('pay_type', e.target.value)}
                className={`${selectClass} ${err('pay_type')}`}
              >
                <option value="">Select pay type</option>
                <option value="salary">Salary</option>
                <option value="hourly">Hourly</option>
              </select>
              {errors.pay_type && <p className="text-xs text-destructive mt-1">{errors.pay_type}</p>}
            </div>
            <div>
              <label className={labelClass}>Salary/Rate (£) *</label>
              <Input type="number" step="0.01" value={formData.salary_or_hourly_rate} onChange={(e) => update('salary_or_hourly_rate', e.target.value)} className={err('salary_or_hourly_rate')} />
              {errors.salary_or_hourly_rate && <p className="text-xs text-destructive mt-1">{errors.salary_or_hourly_rate}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => update('status', e.target.value)}
              className={`${selectClass} ${err('status')}`}
            >
              <option value="pending">Pending</option>
              <option value="open">Open</option>
              <option value="on_hold">On Hold</option>
              <option value="filled">Filled</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {errors.status && <p className="text-xs text-destructive mt-1">{errors.status}</p>}
          </div>

          <div>
            <label className={labelClass}>Reason for Vacancy *</label>
            <select
              value={formData.reason_for_vacancy}
              onChange={(e) => update('reason_for_vacancy', e.target.value)}
              className={`${selectClass} ${err('reason_for_vacancy')}`}
            >
              <option value="">Select reason</option>
              <option value="new_post">New Post</option>
              <option value="replacement">Replacement</option>
              <option value="resignation">Resignation</option>
              <option value="maternity_cover">Maternity Cover</option>
              <option value="expansion">Expansion</option>
              <option value="restructure">Restructure</option>
              <option value="other">Other</option>
            </select>
            {errors.reason_for_vacancy && <p className="text-xs text-destructive mt-1">{errors.reason_for_vacancy}</p>}
          </div>

          <div>
            <label className={labelClass}>Reason Details *</label>
            <Textarea value={formData.reason_details} onChange={(e) => update('reason_details', e.target.value)} className={err('reason_details')} placeholder="Additional details about the vacancy" />
            {errors.reason_details && <p className="text-xs text-destructive mt-1">{errors.reason_details}</p>}
          </div>

          <div>
            <label className={labelClass}>Recruiting Manager *</label>
            <select
              value={formData.recruiting_manager_id}
              onChange={(e) => update('recruiting_manager_id', e.target.value)}
              className={`${selectClass} ${err('recruiting_manager_id')}`}
            >
              <option value="">Select manager</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            {errors.recruiting_manager_id && <p className="text-xs text-destructive mt-1">{errors.recruiting_manager_id}</p>}
          </div>

          <div>
            <label className={labelClass}>Notes *</label>
            <Textarea value={formData.notes} onChange={(e) => update('notes', e.target.value)} className={err('notes')} />
            {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : vacancy ? 'Save Changes' : 'Create Vacancy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}