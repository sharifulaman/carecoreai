import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AnnexAReadinessWarning({ resident }) {
  if (!resident) return null;

  const gaps = [];
  
  // Check for required Annex A fields
  if (!resident.dob) gaps.push('Date of birth');
  if (!resident.placing_local_authority) gaps.push('Placing local authority');
  if (!resident.service_type) gaps.push('Service type');
  if (!resident.address) gaps.push('Current address');
  
  // Check for age-specific requirements (16-17)
  const age = resident.dob ? Math.floor((new Date() - new Date(resident.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
  if (age >= 16 && age < 18 && !resident.accommodation_category) {
    gaps.push('Accommodation category (required for age 16-17)');
  }
  
  if (resident.looked_after_child === undefined || resident.looked_after_child === null) {
    gaps.push('Looked-after child status');
  }
  if (resident.care_leaver_status === undefined || resident.care_leaver_status === null) {
    gaps.push('Care leaver status');
  }
  if (resident.uasc === undefined || resident.uasc === null) {
    gaps.push('UASC status');
  }
  if (resident.english_first_language === undefined || resident.english_first_language === null) {
    gaps.push('English first language status');
  }
  if (!resident.placement_start) gaps.push('Placement start date');
  
  // Check for key contacts
  const hasSocialWorker = resident.social_worker_name || resident.social_worker_email;
  const hasPersonalAdviser = resident.personal_adviser_name || resident.personal_adviser_email;
  if (!hasSocialWorker && resident.looked_after_child) {
    gaps.push('Social worker contact details (required for looked-after children)');
  }
  if (!hasPersonalAdviser && resident.care_leaver_status) {
    gaps.push('Personal adviser contact details (required for care leavers)');
  }

  if (gaps.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-medium text-green-900">✓ Annex A readiness complete</p>
      </div>
    );
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 mb-6">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900">Annex A readiness gaps found</AlertTitle>
      <AlertDescription className="text-amber-800 mt-2">
        <p className="text-sm mb-2">The following fields are missing or incomplete:</p>
        <ul className="list-disc list-inside text-sm space-y-1">
          {gaps.map((gap, idx) => <li key={idx}>{gap}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}