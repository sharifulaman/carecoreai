import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export default function StaffServiceAssignmentForm({ staffId, staffName, isOpen, onClose, onSave, canEdit = true }) {
  const [loading, setLoading] = useState(false);
  const [homes, setHomes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [formData, setFormData] = useState({
    home_id: '',
    service_type: 'outreach',
    accommodation_category: 'self_contained',
    assignment_start_date: new Date().toISOString().split('T')[0],
    primary_assignment: false,
    allocation_percentage: 100,
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, staffId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [homesData, assignmentsData] = await Promise.all([
        base44.entities.Home.list(),
        base44.entities.StaffServiceAssignment.filter({ staff_id: staffId }),
      ]);
      setHomes(homesData || []);
      setAssignments(assignmentsData || []);
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    try {
      setLoading(true);
      const selectedHome = homes.find((h) => h.id === formData.home_id);
      await base44.entities.StaffServiceAssignment.create({
        staff_id: staffId,
        staff_name: staffName,
        home_id: formData.home_id,
        home_name: selectedHome?.name,
        service_type: formData.service_type,
        accommodation_category: formData.accommodation_category,
        assignment_start_date: formData.assignment_start_date,
        primary_assignment: formData.primary_assignment,
        allocation_percentage: formData.allocation_percentage,
        active: true,
      });
      await fetchData();
      setFormData({
        home_id: '',
        service_type: 'outreach',
        accommodation_category: 'self_contained',
        assignment_start_date: new Date().toISOString().split('T')[0],
        primary_assignment: false,
        allocation_percentage: 100,
      });
    } catch (e) {
      console.error('Error adding assignment:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    try {
      setLoading(true);
      await base44.entities.StaffServiceAssignment.delete(id);
      await fetchData();
    } catch (e) {
      console.error('Error deleting assignment:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Assignments — {staffName}</DialogTitle>
        </DialogHeader>

        {loading && !homes.length ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add Assignment Form */}
            {canEdit && (
              <div className="space-y-4 border-b pb-4">
                <h3 className="font-semibold">Add Assignment</h3>
                <div>
                  <Label>Home *</Label>
                  <Select value={formData.home_id} onValueChange={(value) => setFormData({ ...formData, home_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select home" />
                    </SelectTrigger>
                    <SelectContent>
                      {homes.map((home) => (
                        <SelectItem key={home.id} value={home.id}>
                          {home.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Service Type</Label>
                  <Select value={formData.service_type} onValueChange={(value) => setFormData({ ...formData, service_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outreach">Outreach</SelectItem>
                      <SelectItem value="eighteen_plus">18+ Support</SelectItem>
                      <SelectItem value="twenty_four_hours">24 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Accommodation Category</Label>
                  <Select
                    value={formData.accommodation_category}
                    onValueChange={(value) => setFormData({ ...formData, accommodation_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self_contained">Self-contained</SelectItem>
                      <SelectItem value="shared_ring_fenced">Shared (Ring-fenced)</SelectItem>
                      <SelectItem value="shared_non_ring_fenced">Shared (Non ring-fenced)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assignment Start Date</Label>
                  <Input
                    type="date"
                    value={formData.assignment_start_date}
                    onChange={(e) => setFormData({ ...formData, assignment_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Allocation %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.allocation_percentage}
                    onChange={(e) => setFormData({ ...formData, allocation_percentage: parseInt(e.target.value) })}
                  />
                </div>
                <Button onClick={handleAddAssignment} disabled={loading || !formData.home_id}>
                  Add Assignment
                </Button>
              </div>
            )}

            {/* Assignments List */}
            <div>
              <h3 className="font-semibold mb-4">Current Assignments</h3>
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{assignment.home_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.service_type} • {assignment.accommodation_category}
                      </div>
                      <div className="text-sm">
                        From {assignment.assignment_start_date} • {assignment.allocation_percentage}% allocation
                      </div>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => { onSave?.(); onClose(); }} disabled={loading}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}