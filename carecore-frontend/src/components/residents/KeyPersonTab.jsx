import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import KeyPersonModal from './modals/KeyPersonModal';
import { useModuleActions } from '@/lib/PermissionContext';

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

export default function KeyPersonTab({ resident }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const { canAdd, canEdit: permCanEdit, canDelete } = useModuleActions("residents");

  const { data: keyPeople = [] } = useQuery({
    queryKey: ['keyPeople', resident.id],
    queryFn: () => base44.entities.KeyPerson.filter({ resident_id: resident.id })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.KeyPerson.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyPeople', resident.id] });
      toast.success('Key person removed');
    }
  });

  const handleDelete = (id) => {
    if (window.confirm('Remove this contact?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['keyPeople', resident.id] });
  };

  const primaryContacts = keyPeople.filter(p => p.is_primary_contact && p.status === 'active');

  return (
    <div className="space-y-6">
      {/* Summary of key contacts */}
      {primaryContacts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm text-blue-900 mb-3">Primary Contacts</h3>
          <div className="space-y-2">
            {primaryContacts.map(contact => (
              <div key={contact.id} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900">{contact.contact_name}</p>
                  <p className="text-xs text-blue-700">{ROLE_LABELS[contact.role] || contact.role}</p>
                  {contact.organisation && <p className="text-xs text-blue-600">{contact.organisation}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new button */}
      {canAdd && (
        <Button onClick={() => { setEditing(null); setShowModal(true); }} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Key Person
        </Button>
      )}

      {/* Key people table */}
      {keyPeople.length > 0 ? (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Name</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Role</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Organisation</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Phone</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-700">Status</th>
                <th className="px-4 py-2 text-center font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keyPeople.map(person => (
                <tr key={person.id} className={`border-b border-slate-100 ${person.status === 'inactive' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{person.contact_name}</p>
                      {person.is_primary_contact && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Primary</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{ROLE_LABELS[person.role] || person.role}</td>
                  <td className="px-4 py-3 text-slate-700">{person.organisation || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{person.mobile_number || person.office_phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{person.email_address || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${person.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {person.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center flex gap-2 justify-center">
                    {permCanEdit && (
                      <button onClick={() => { setEditing(person); setShowModal(true); }} className="text-blue-600 hover:text-blue-800">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(person.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-slate-50 rounded-lg">
          <p className="text-slate-600 text-sm">No key people added yet.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <KeyPersonModal
          resident={resident}
          contact={editing}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}