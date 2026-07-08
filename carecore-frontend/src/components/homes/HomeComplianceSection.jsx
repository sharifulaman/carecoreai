import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomeComplianceSection({ formData, setFormData }) {
  const complianceChecks = [
    { key: 'gas_safety', label: 'Gas Safety Certificate', requiredFields: ['gas_safety_expiry', 'gas_safety_evidence_url'] },
    { key: 'electrical', label: 'Electrical Installation Condition Report (EICR)', requiredFields: ['electrical_cert_expiry'] },
    { key: 'fire_risk', label: 'Fire Risk Assessment', requiredFields: ['fire_risk_assessment_expiry', 'fire_risk_assessment_evidence_url'] },
    { key: 'pat', label: 'Portable Appliance Testing (PAT)', requiredFields: ['pat_testing_expiry'] },
    { key: 'epc', label: 'Energy Performance Certificate (EPC)', requiredFields: ['epc_expiry'] },
    { key: 'insurance', label: 'Insurance Certificate', requiredFields: ['insurance_expiry'] },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Premises Compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Premises Status */}
        <div className="space-y-4 border-b pb-4">
          <h4 className="font-semibold text-sm">Premises Status</h4>
          <div className="space-y-3">
            <div>
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.premises_currently_in_use || false}
                  onChange={(e) => setFormData({ ...formData, premises_currently_in_use: e.target.checked })}
                />
                Currently in use
              </Label>
            </div>
            {!formData.premises_currently_in_use && (
              <>
                <div>
                  <Label>Reason not in use</Label>
                  <Input
                    value={formData.reason_not_in_use || ''}
                    onChange={(e) => setFormData({ ...formData, reason_not_in_use: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Date stopped being used</Label>
                  <Input
                    type="date"
                    value={formData.date_stopped_being_used || ''}
                    onChange={(e) => setFormData({ ...formData, date_stopped_being_used: e.target.value })}
                  />
                </div>
              </>
            )}
            <div>
              <Label>Date added to registration</Label>
              <Input
                type="date"
                value={formData.date_added_to_registration || ''}
                onChange={(e) => setFormData({ ...formData, date_added_to_registration: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Alterations */}
        <div className="space-y-4 border-b pb-4">
          <h4 className="font-semibold text-sm">Substantial Alterations</h4>
          <div>
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.substantial_alteration_since_registration || false}
                onChange={(e) => setFormData({ ...formData, substantial_alteration_since_registration: e.target.checked })}
              />
              Substantial alteration since registration?
            </Label>
          </div>
          {formData.substantial_alteration_since_registration && (
            <>
              <div>
                <Label>Alteration Details</Label>
                <Input
                  value={formData.alteration_details || ''}
                  onChange={(e) => setFormData({ ...formData, alteration_details: e.target.value })}
                />
              </div>
              <div>
                <Label>Alteration Date</Label>
                <Input
                  type="date"
                  value={formData.alteration_date || ''}
                  onChange={(e) => setFormData({ ...formData, alteration_date: e.target.value })}
                />
              </div>
            </>
          )}
        </div>

        {/* Capacity */}
        <div className="space-y-4 border-b pb-4">
          <h4 className="font-semibold text-sm">Capacity</h4>
          <div>
            <Label>Number of Beds Capacity</Label>
            <Input
              type="number"
              value={formData.number_of_beds_capacity || ''}
              onChange={(e) => setFormData({ ...formData, number_of_beds_capacity: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Compliance Documents */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Safety Certificates</h4>
          {complianceChecks.map((check) => (
            <div key={check.key} className="border rounded-lg p-4 space-y-2">
              <h5 className="font-medium text-sm">{check.label}</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Last Date</Label>
                  <Input
                    type="date"
                    value={formData[check.key + '_last_date'] || ''}
                    onChange={(e) => setFormData({ ...formData, [check.key + '_last_date']: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={formData[check.key.replace(/_/g, '_') + '_expiry'] || ''}
                    onChange={(e) => setFormData({ ...formData, [check.key.replace(/_/g, '_') + '_expiry']: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Evidence URL</Label>
                <Input
                  value={formData[check.key + '_evidence_url'] || ''}
                  onChange={(e) => setFormData({ ...formData, [check.key + '_evidence_url']: e.target.value })}
                  placeholder="URL of uploaded certificate"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}