import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

export default function OrganisationProfileForm({ isOpen, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    trading_name: '',
    ofsted_urn: '',
    registration_date: '',
    organisation_status: 'registered',
    registered_service_manager_name: '',
    registered_manager_qualification_held: false,
    qualification_name: '',
    qualification_issued_date: '',
    nominated_individual_name: '',
    nominated_individual_contact: '',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchOrgProfile();
    }
  }, [isOpen]);

  const fetchOrgProfile = async () => {
    try {
      setLoading(true);
      const profiles = await base44.entities.Organisation.list('', 1);
      if (profiles?.length > 0) {
        setProfile(profiles[0]);
        setFormData(profiles[0]);
      }
    } catch (e) {
      console.error('Error fetching org profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (profile?.id) {
        await base44.entities.Organisation.update(profile.id, formData);
      } else {
        await base44.entities.Organisation.create(formData);
      }
      onSave?.();
      onClose();
    } catch (e) {
      console.error('Error saving org profile:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Organisation Profile</DialogTitle>
        </DialogHeader>

        {loading && !profile ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Legal Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Legal Details</h3>
              <div>
                <Label>Provider Legal Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Registered legal name"
                />
              </div>
              <div>
                <Label>Trading Name</Label>
                <Input
                  value={formData.trading_name}
                  onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Ofsted URN</Label>
                <Input
                  value={formData.ofsted_urn}
                  onChange={(e) => setFormData({ ...formData, ofsted_urn: e.target.value })}
                  placeholder="e.g. EY123456"
                />
              </div>
              <div>
                <Label>Registration Date</Label>
                <Input
                  type="date"
                  value={formData.registration_date}
                  onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.organisation_status} onValueChange={(value) => setFormData({ ...formData, organisation_status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="provisional_registration">Provisional Registration</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="de_registered">De-registered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Registered Manager */}
            <div className="space-y-4">
              <h3 className="font-semibold">Registered Manager</h3>
              <div>
                <Label>Registered Service Manager Name</Label>
                <Input
                  value={formData.registered_service_manager_name}
                  onChange={(e) => setFormData({ ...formData, registered_service_manager_name: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={formData.registered_manager_qualification_held}
                  onCheckedChange={(checked) => setFormData({ ...formData, registered_manager_qualification_held: checked })}
                />
                <Label>Qualification held?</Label>
              </div>
              {formData.registered_manager_qualification_held && (
                <>
                  <div>
                    <Label>Qualification Name</Label>
                    <Input
                      value={formData.qualification_name}
                      onChange={(e) => setFormData({ ...formData, qualification_name: e.target.value })}
                      placeholder="e.g. Level 3 Diploma in Children's Workforce"
                    />
                  </div>
                  <div>
                    <Label>Qualification Issue Date</Label>
                    <Input
                      type="date"
                      value={formData.qualification_issued_date}
                      onChange={(e) => setFormData({ ...formData, qualification_issued_date: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Nominated Individual */}
            <div className="space-y-4">
              <h3 className="font-semibold">Nominated Individual</h3>
              <div>
                <Label>Name</Label>
                <Input
                  value={formData.nominated_individual_name}
                  onChange={(e) => setFormData({ ...formData, nominated_individual_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Contact</Label>
                <Input
                  value={formData.nominated_individual_contact}
                  onChange={(e) => setFormData({ ...formData, nominated_individual_contact: e.target.value })}
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Details</h3>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={formData.contact_address}
                  onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}