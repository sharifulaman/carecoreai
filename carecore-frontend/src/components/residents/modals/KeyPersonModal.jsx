import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
  'social_worker', 'personal_adviser', 'independent_reviewing_officer', 'lac_nurse',
  'missing_coordinator', 'youth_offending_team', 'camhs_worker', 'independent_advocate',
  'parent', 'carer', 'college_tutor', 'solicitor', 'other'
];

const ROLE_LABELS = {
  social_worker: 'Social Worker',
  personal_adviser: 'Personal Adviser',
  independent_reviewing_officer: 'Independent Reviewing Officer',
  lac_nurse: 'LAC Nurse',
  missing_coordinator: 'Police Missing Coordinator',
  youth_offending_team: 'Youth Offending Team Worker',
  camhs_worker: 'CAMHS Worker',
  independent_advocate: 'Independent Advocate',
  parent: 'Parent',
  carer: 'Carer',
  college_tutor: 'College Tutor',
  solicitor: 'Solicitor',
  other: 'Other'
};

export default function KeyPersonModal({ resident, contact, onClose }) {
  const [form, setForm] = useState(contact || {
    contact_name: '',
    role: '',
    organisation: '',
    office_phone: '',
    mobile_number: '',
    email_address: '',
    relationship_type: '',
    is_primary_contact: false,
    status: 'active',
    contact_notes: '',
    last_verified_date: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const errs = {};
    if (!form.contact_name?.trim()) errs.contact_name = 'Name is required';
    if (!form.role) errs.role = 'Role is required';
    if (form.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_address)) {
      errs.email_address = 'Invalid email address';
    }
    return errs;
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (contact?.id) {
        return base44.entities.KeyPerson.update(contact.id, data);
      } else {
        return base44.entities.KeyPerson.create({
          ...data,
          org_id: resident.org_id,
          resident_id: resident.id,
          resident_name: resident.display_name,
          home_id: resident.home_id,
          added_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      toast.success(contact?.id ? 'Contact updated' : 'Contact added');
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save contact');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">{contact?.id ? 'Edit' : 'Add'} Key Person</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.contact_name ? 'border-red-400' : 'border-slate-200'}`}
                placeholder="Full name" />
              {errors.contact_name && <p className="text-xs text-red-500 mt-1">{errors.contact_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
              <select value={form.role} onChange={e => set('role', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.role ? 'border-red-400' : 'border-slate-200'}`}>
                <option value="">Select role...</option>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organisation / Agency</label>
              <input value={form.organisation} onChange={e => set('organisation', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="e.g. Local Authority, NHS Trust" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Office Phone</label>
              <input value={form.office_phone} onChange={e => set('office_phone', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Office number" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
              <input value={form.mobile_number} onChange={e => set('mobile_number', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="Mobile number" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input type="email" value={form.email_address} onChange={e => set('email_address', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.email_address ? 'border-red-400' : 'border-slate-200'}`}
                placeholder="email@example.com" />
              {errors.email_address && <p className="text-xs text-red-500 mt-1">{errors.email_address}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship Type</label>
              <input value={form.relationship_type} onChange={e => set('relationship_type', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="e.g. Professional, Family" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Verified</label>
              <input type="date" value={form.last_verified_date} onChange={e => set('last_verified_date', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_primary_contact} onChange={e => set('is_primary_contact', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300" />
                <span className="text-sm font-medium text-slate-700">Mark as primary contact for this role</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.status === 'active'} onChange={e => set('status', e.target.checked ? 'active' : 'inactive')}
                  className="w-4 h-4 rounded border-slate-300" />
                <span className="text-sm font-medium text-slate-700">Active</span>
              </label>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <textarea value={form.contact_notes} onChange={e => set('contact_notes', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none h-24"
                placeholder="Additional notes..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save Contact'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}