import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function StaffMovementForm({ staffId, staffName, staffRole, isSupportRole, isOpen, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    movement_type: 'new_starter',
    movement_date: new Date().toISOString().split('T')[0],
    employment_type: 'permanent',
    reason: '',
    previous_role: '',
    new_role: '',
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await base44.entities.StaffMovement.create({
        staff_id: staffId,
        staff_name: staffName,
        staff_role: staffRole,
        is_support_role: isSupportRole,
        movement_type: formData.movement_type,
        movement_date: formData.movement_date,
        employment_type: formData.employment_type,
        previous_role: formData.previous_role || null,
        new_role: formData.new_role || null,
        reason: formData.reason,
      });
      onSave?.();
      onClose();
    } catch (e) {
      console.error('Error recording movement:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Staff Movement — {staffName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Movement Type *</Label>
            <Select value={formData.movement_type} onValueChange={(value) => setFormData({ ...formData, movement_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_starter">New Starter</SelectItem>
                <SelectItem value="leaver">Leaver</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="service_reassignment">Service Reassignment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Movement Date *</Label>
            <Input
              type="date"
              value={formData.movement_date}
              onChange={(e) => setFormData({ ...formData, movement_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Employment Type</Label>
            <Select value={formData.employment_type} onValueChange={(value) => setFormData({ ...formData, employment_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="contractor">Contractor</SelectItem>
                <SelectItem value="temporary">Temporary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.movement_type === 'role_change' || formData.movement_type === 'service_reassignment') && (
            <>
              <div>
                <Label>Previous Role</Label>
                <Input
                  value={formData.previous_role}
                  onChange={(e) => setFormData({ ...formData, previous_role: e.target.value })}
                />
              </div>
              <div>
                <Label>New Role</Label>
                <Input
                  value={formData.new_role}
                  onChange={(e) => setFormData({ ...formData, new_role: e.target.value })}
                />
              </div>
            </>
          )}

          <div>
            <Label>Reason</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Reason for this movement"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Movement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}