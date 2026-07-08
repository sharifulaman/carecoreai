// __tests__/staffForm.api.test.js
import { describe, it, expect, beforeAll } from 'vitest';
import { getToken } from '../tests/getToken';
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');



// Helper to get the staff profile hint (needed for secureDataGateway)
async function getStaffProfileHint(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get user profile: ${res.status}`);
  }
  
  const payload = await res.json();
  const user = payload?.data || payload;
  
  return {
    staff_profile_id: user.staff_profile_id || user.id,
    org_id: user.org_id,
    role: user.role,
    home_ids: Array.isArray(user.home_ids) ? user.home_ids : [],
    primary_home_id: user.primary_home_id || null,
    email: user.email || null,
    hint_version: 2,
  };
}

describe('Staff creation – real backend', () => {
  let token;
  let hint;

  beforeAll(async () => {
    token = await getToken({
        email:import.meta.env.VITE_EMAIL,
        password:import.meta.env.VITE_PASSWORD
    });
    
    
    try {
      hint = await getStaffProfileHint(token);
      console.log('✅ Got staff profile hint:', hint);
    } catch (error) {
      console.warn('⚠️ Could not get staff profile hint:', error.message);
    
      hint = {
        org_id: 'your-org-id', 
        role: 'admin',
        home_ids: [],
        primary_home_id: null,
        email: 'admin@test.com',
        hint_version: 2,
      };
    }
  });

  it('creates a staff profile using the correct secureDataGateway format', async () => {
    const staffData = {
      full_name: 'Test Team Leader User',
      email: 'team_leader_test@sl.com',
      role: 'team_leader',
      phone: '07700900000',
      start_date: '2024-06-01',
      employment_type: 'permanent',
      status: 'pending',
      is_support_role: false,
      org_id: hint.org_id, 
      team_leader_id: '',
      home_ids: [],
      assigned_accommodation_categories: [],
      photo_url: '',
      employee_id: '',
      pay_frequency: '',
      annual_salary: 0,
      dbs_number: '',
      dbs_expiry: null,
      end_date: null,
    
    };


    const secureDataGatewayPayload = {
      entity: 'StaffProfile',
      operation: 'create',
      data: staffData,
      _hint: hint
    };

    

    const res = await fetch(`${API_BASE}/functions/secureDataGateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(secureDataGatewayPayload)
    });

    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      console.error('Error response:', errorBody);
      throw new Error(`Creation failed: ${res.status} - ${JSON.stringify(errorBody)}`);
    }

    const response = await res.json();
    console.log('Success response:', response);
    expect(response.data.data.full_name).toBe(staffData.full_name)

    
   
  });
  it("Get a staff", async () => {
    const response = await fetch(`${API_BASE}/entities/StaffProfile?status=active&role=team_leader`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

    console.log('Response status:', response.json());
  })

  
});