import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AgencyBankUsageForm({ isOpen, onClose, onSave, usage }) {
  const [loading, setLoading] = useState(false);
  const [homes, setHomes] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    usage_date: new Date().toISOString().split('T')[0],
    worker_name_or_reference: '',
    agency_bank_type: '',
    agency_organisation_name: '',
    shift_home_id: '',
    service_type: '',
    accommodation_category: '',
    hours_worked: '',
    shift_start_time: '',
    shift_end_time: '',
    role: '',
    is_support_role: '',
    reason_used: '',
    cost_per_hour: '',
    notes: '',
    status: 'pending',
  });

  useEffect(() => {
    if (isOpen) {
      fetchHomes();
      if (usage) {
        setFormData({
          usage_date: usage.usage_date ? new Date(usage.usage_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          worker_name_or_reference: usage.worker_name_or_reference || '',
          agency_bank_type: usage.agency_bank_type || '',
          agency_organisation_name: usage.agency_organisation_name || '',
          shift_home_id: usage.shift_home_id || '',
          service_type: usage.service_type || '',
          accommodation_category: usage.accommodation_category || '',
          hours_worked: usage.hours_worked || '',
          shift_start_time: usage.shift_start_time || '',
          shift_end_time: usage.shift_end_time || '',
          role: usage.role || '',
          is_support_role: usage.is_support_role !== undefined ? String(usage.is_support_role) : '',
          reason_used: usage.reason_used || '',
          cost_per_hour: usage.cost_per_hour || '',
          notes: usage.notes || '',
          status: usage.status || 'pending',
        });
      } else {
        setFormData({
          usage_date: new Date().toISOString().split('T')[0],
          worker_name_or_reference: '',
          agency_bank_type: '',
          agency_organisation_name: '',
          shift_home_id: '',
          service_type: '',
          accommodation_category: '',
          hours_worked: '',
          shift_start_time: '',
          shift_end_time: '',
          role: '',
          is_support_role: '',
          reason_used: '',
          cost_per_hour: '',
          notes: '',
          status: 'pending',
        });
      }
      setErrors({});
    }
  }, [isOpen, usage]);

  const fetchHomes = async () => {
    try {
      const data = await base44.entities.Home.list();
      setHomes(data || []);
    } catch (e) {
      console.error('Error fetching homes:', e);
    }
  };

  const update = (key, value) => {
    setFormData(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.worker_name_or_reference?.trim()) errs.worker_name_or_reference = 'Worker name or reference is required';
    if (!formData.agency_bank_type) errs.agency_bank_type = 'Agency/Bank type is required';
    if (!formData.agency_organisation_name?.trim()) errs.agency_organisation_name = 'Organisation name is required';
    if (!formData.role?.trim()) errs.role = 'Role is required';
    if (formData.is_support_role === '') errs.is_support_role = 'Please select if this is a support role';
    if (!formData.usage_date) errs.usage_date = 'Usage date is required';
    if (!formData.shift_home_id) errs.shift_home_id = 'Home is required';
    if (!formData.service_type) errs.service_type = 'Service type is required';
    if (!formData.accommodation_category) errs.accommodation_category = 'Accommodation category is required';
    if (!formData.shift_start_time) errs.shift_start_time = 'Start time is required';
    if (!formData.shift_end_time) errs.shift_end_time = 'End time is required';
    if (!formData.hours_worked) errs.hours_worked = 'Hours worked is required';
    if (!formData.reason_used) errs.reason_used = 'Reason is required';
    if (!formData.cost_per_hour) errs.cost_per_hour = 'Cost per hour is required';
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
      const selectedHome = homes.find((h) => h.id === formData.shift_home_id);
      const payload = {
        ...formData,
        is_support_role: formData.is_support_role === 'true',
        shift_home_name: selectedHome?.name,
        cost_per_hour: parseFloat(formData.cost_per_hour),
        hours_worked: parseFloat(formData.hours_worked),
      };
      
      if (usage?.id) {
        await base44.entities.AgencyBankStaffUsage.update(usage.id, payload);
        toast.success("Record updated");
      } else {
        await base44.entities.AgencyBankStaffUsage.create(payload);
        toast.success("Usage recorded");
      }
      onSave?.();
      onClose();
    } catch (e) {
      console.error('Error recording usage:', e);
      toast.error(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const err = (field) => errors[field] ? 'border-destructive' : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{usage ? 'Edit Agency/Bank' : 'Create Agency/Bank'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Worker Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Worker Details</h3>
            <div>
              <Label>Worker Name or Reference *</Label>
              <Input value={formData.worker_name_or_reference} onChange={(e) => update('worker_name_or_reference', e.target.value)} className={`mt-1.5 ${err('worker_name_or_reference')}`} />
              {errors.worker_name_or_reference && <p className="text-xs text-destructive mt-1">{errors.worker_name_or_reference}</p>}
            </div>
            <div>
              <Label>Agency/Bank Type *</Label>
              <Select value={formData.agency_bank_type} onValueChange={(v) => update('agency_bank_type', v)}>
                <SelectTrigger className={`mt-1.5 ${err('agency_bank_type')}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency">Agency</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
              {errors.agency_bank_type && <p className="text-xs text-destructive mt-1">{errors.agency_bank_type}</p>}
            </div>
            <div>
              <Label>Agency/Bank Organisation Name *</Label>
              <Input value={formData.agency_organisation_name} onChange={(e) => update('agency_organisation_name', e.target.value)} className={`mt-1.5 ${err('agency_organisation_name')}`} />
              {errors.agency_organisation_name && <p className="text-xs text-destructive mt-1">{errors.agency_organisation_name}</p>}
            </div>
            <div>
              <Label>Role *</Label>
              <Input value={formData.role} onChange={(e) => update('role', e.target.value)} className={`mt-1.5 ${err('role')}`} />
              {errors.role && <p className="text-xs text-destructive mt-1">{errors.role}</p>}
            </div>
            <div>
              <Label>Is this a support role? *</Label>
              <Select value={formData.is_support_role} onValueChange={(v) => update('is_support_role', v)}>
                <SelectTrigger className={`mt-1.5 ${err('is_support_role')}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
              {errors.is_support_role && <p className="text-xs text-destructive mt-1">{errors.is_support_role}</p>}
            </div>
          </div>

          {/* Shift Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Shift Details</h3>
            <div>
              <Label>Usage Date *</Label>
              <Input type="date" value={formData.usage_date} onChange={(e) => update('usage_date', e.target.value)} className={`mt-1.5 ${err('usage_date')}`} />
              {errors.usage_date && <p className="text-xs text-destructive mt-1">{errors.usage_date}</p>}
            </div>
            <div>
              <Label>Home *</Label>
              <Select value={formData.shift_home_id} onValueChange={(v) => update('shift_home_id', v)}>
                <SelectTrigger className={`mt-1.5 ${err('shift_home_id')}`}><SelectValue placeholder="Select home" /></SelectTrigger>
                <SelectContent>
                  {homes.map((home) => <SelectItem key={home.id} value={home.id}>{home.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.shift_home_id && <p className="text-xs text-destructive mt-1">{errors.shift_home_id}</p>}
            </div>
            <div>
              <Label>Service Type *</Label>
              <Select value={formData.service_type} onValueChange={(v) => update('service_type', v)}>
                <SelectTrigger className={`mt-1.5 ${err('service_type')}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outreach">Outreach</SelectItem>
                  <SelectItem value="eighteen_plus">18+ Support</SelectItem>
                  <SelectItem value="twenty_four_hours">24 Hours</SelectItem>
                </SelectContent>
              </Select>
              {errors.service_type && <p className="text-xs text-destructive mt-1">{errors.service_type}</p>}
            </div>
            <div>
              <Label>Accommodation Category *</Label>
              <Select value={formData.accommodation_category} onValueChange={(v) => update('accommodation_category', v)}>
                <SelectTrigger className={`mt-1.5 ${err('accommodation_category')}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self_contained">Self-contained</SelectItem>
                  <SelectItem value="shared_ring_fenced">Shared (Ring-fenced)</SelectItem>
                  <SelectItem value="shared_non_ring_fenced">Shared (Non ring-fenced)</SelectItem>
                </SelectContent>
              </Select>
              {errors.accommodation_category && <p className="text-xs text-destructive mt-1">{errors.accommodation_category}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Start Time *</Label>
                <Input type="time" value={formData.shift_start_time} onChange={(e) => update('shift_start_time', e.target.value)} className={`mt-1.5 ${err('shift_start_time')}`} />
                {errors.shift_start_time && <p className="text-xs text-destructive mt-1">{errors.shift_start_time}</p>}
              </div>
              <div>
                <Label>End Time *</Label>
                <Input type="time" value={formData.shift_end_time} onChange={(e) => update('shift_end_time', e.target.value)} className={`mt-1.5 ${err('shift_end_time')}`} />
                {errors.shift_end_time && <p className="text-xs text-destructive mt-1">{errors.shift_end_time}</p>}
              </div>
              <div>
                <Label>Hours Worked *</Label>
                <Input type="number" step="0.5" value={formData.hours_worked} onChange={(e) => update('hours_worked', e.target.value)} className={`mt-1.5 ${err('hours_worked')}`} />
                {errors.hours_worked && <p className="text-xs text-destructive mt-1">{errors.hours_worked}</p>}
              </div>
            </div>
            <div>
              <Label>Reason Used *</Label>
              <Select value={formData.reason_used} onValueChange={(v) => update('reason_used', v)}>
                <SelectTrigger className={`mt-1.5 ${err('reason_used')}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff_absence">Staff Absence</SelectItem>
                  <SelectItem value="vacancy_cover">Vacancy Cover</SelectItem>
                  <SelectItem value="peak_demand">Peak Demand</SelectItem>
                  <SelectItem value="specialist_skill">Specialist Skill</SelectItem>
                  <SelectItem value="maternity_cover">Maternity Cover</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.reason_used && <p className="text-xs text-destructive mt-1">{errors.reason_used}</p>}
            </div>
          </div>

          {/* Cost & Notes */}
          <div className="space-y-4">
            <h3 className="font-semibold">Additional Details</h3>
            <div>
              <Label>Cost per Hour (£) *</Label>
              <Input type="number" step="0.01" value={formData.cost_per_hour} onChange={(e) => update('cost_per_hour', e.target.value)} className={`mt-1.5 ${err('cost_per_hour')}`} />
              {errors.cost_per_hour && <p className="text-xs text-destructive mt-1">{errors.cost_per_hour}</p>}
            </div>
            <div>
              <Label>Notes *</Label>
              <Textarea value={formData.notes} onChange={(e) => update('notes', e.target.value)} className={err('notes')} />
              {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes}</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (usage ? 'Save Changes' : 'Create Agency/Bank')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}