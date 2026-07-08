import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

export default function StaffProfileEnhancementFields({ formData, setFormData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Role & Employment Details (Phase 4)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Support Role Flag */}
        <div>
          <Label className="flex items-center gap-2">
            <Checkbox
              checked={formData.is_support_role || false}
              onCheckedChange={(checked) => setFormData({ ...formData, is_support_role: checked })}
            />
            <span>This is a support worker role (not management/admin)</span>
          </Label>
        </div>

        {/* Employment Type */}
        <div>
          <Label>Employment Type</Label>
          <Select value={formData.employment_type || 'permanent'} onValueChange={(value) => setFormData({ ...formData, employment_type: value })}>
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

        {/* Accommodation Categories */}
        <div>
          <Label>Assigned Accommodation Categories</Label>
          <div className="space-y-2 mt-2">
            {['self_contained', 'shared_ring_fenced', 'shared_non_ring_fenced'].map((category) => (
              <Label key={category} className="flex items-center gap-2">
                <Checkbox
                  checked={(formData.assigned_accommodation_categories || []).includes(category)}
                  onCheckedChange={(checked) => {
                    const current = formData.assigned_accommodation_categories || [];
                    if (checked) {
                      setFormData({
                        ...formData,
                        assigned_accommodation_categories: [...current, category],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        assigned_accommodation_categories: current.filter((c) => c !== category),
                      });
                    }
                  }}
                />
                <span>
                  {category === 'self_contained'
                    ? 'Self-contained'
                    : category === 'shared_ring_fenced'
                    ? 'Shared (Ring-fenced)'
                    : 'Shared (Non ring-fenced)'}
                </span>
              </Label>
            ))}
          </div>
        </div>

        {/* Primary Home (if applicable) */}
        <div>
          <Label>Primary Home ID</Label>
          <Input
            value={formData.primary_home_id || ''}
            onChange={(e) => setFormData({ ...formData, primary_home_id: e.target.value })}
            placeholder="Home ID or leave blank"
          />
        </div>
      </CardContent>
    </Card>
  );
}