import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, Loader2 } from 'lucide-react';

export default function OrganisationOfficerForm({ isOpen, onClose, onSave }) {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'officer',
    is_nominated_individual: false,
    start_date: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchOfficers();
    }
  }, [isOpen]);

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.OrganisationOfficer.list();
      setOfficers(data || []);
    } catch (e) {
      console.error('Error fetching officers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    try {
      setLoading(true);
      if (editingIndex !== null) {
        const officer = officers[editingIndex];
        await base44.entities.OrganisationOfficer.update(officer.id, formData);
      } else {
        await base44.entities.OrganisationOfficer.create(formData);
      }
      await fetchOfficers();
      resetForm();
    } catch (e) {
      console.error('Error saving officer:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await base44.entities.OrganisationOfficer.delete(id);
      await fetchOfficers();
    } catch (e) {
      console.error('Error deleting officer:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (officer, index) => {
    setFormData(officer);
    setEditingIndex(index);
  };

  const resetForm = () => {
    setFormData({ name: '', role: 'officer', is_nominated_individual: false, start_date: '', email: '', phone: '' });
    setEditingIndex(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave?.();
      onClose();
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Directors & Officers</DialogTitle>
        </DialogHeader>

        {loading && officers.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Form */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">{editingIndex !== null ? 'Edit Officer' : 'Add Officer'}</h3>
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="officer">Officer</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="trustee">Trustee</SelectItem>
                    <SelectItem value="nominated_individual">Nominated Individual</SelectItem>
                    <SelectItem value="company_secretary">Company Secretary</SelectItem>
                    <SelectItem value="chair">Chair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.is_nominated_individual}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_nominated_individual: checked })}
                />
                <Label>This person is the nominated individual</Label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddOrUpdate} disabled={loading}>
                  {editingIndex !== null ? 'Update' : 'Add'}
                </Button>
                {editingIndex !== null && (
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Officers List */}
            <div>
              <h3 className="font-semibold mb-4">Officers & Directors</h3>
              <div className="space-y-2">
                {officers.map((officer, idx) => (
                  <div key={officer.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium">{officer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {officer.role} {officer.is_nominated_individual && '• Nominated Individual'}
                      </div>
                      {officer.email && <div className="text-sm">{officer.email}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(officer, idx)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(officer.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}