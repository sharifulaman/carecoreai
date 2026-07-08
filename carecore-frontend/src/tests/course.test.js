import {describe, it, expect, beforeAll } from 'vitest';
import {getToken} from '@/tests/getToken'
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');

const category = [
    'safeguarding',
    'health & safety',
    'clinical',
    'behaviour',
    'legislation',
    'compliance',
    'induction',
    'other'
];
const mandatory = [
    'mandatory for all',
    'role specific',
    'optional'
];
const data = [
     {
    course_name:"Test course name",
    category:category[2],
    home_types:["1", "2"],
    roles:["admin", "staff"],
    expiry_months:parseInt(0),
    is_mandatory:true,
    mandatory:mandatory[1],
    display_order:33,
    is_active:false,
    notes:'test',
    provider:"test provider",
    duration_hours:parseFloat(44.4),
},
 {
    course_name:"Test course name",
    category:category[0],
    home_types:["1", "2"],
    roles:["admin", "staff"],
    expiry_months:parseInt(0),
    is_mandatory:true,
    mandatory:mandatory[1],
    display_order:33,
    is_active:false,
    notes:'test',
    provider:"test provider",
    duration_hours:parseFloat(44.4),
}
];
const testCases = data.map((d, index) => ({
    index: index + 1,
    d:d
}))
const getStaffProfileHint = async (token) => {
    const response = await fetch(`${API_BASE}/auth/me`, {
        headers:{
            'Authorization':`Bearer ${token}`,
            'Content-Type':'application/json'
        }
    });
    if(!res.ok) {
        throw new Error(`Failed to get user profile: ${res.status}`)
    }
    const payload = await response.json();
    const user = payload?.data || payload;
    return {
        staff_profile_id:user.staff_profile_id || user.id,
        org_id: user.org_id,
        role:user.role,
        home_ids:Array.isArray(user.home_ids) ? user.home_ids : [],
        primary_home_id: user.primary_home_id || null,
        email: user.email || null,
        hint_version: 2,
    }
}

describe('Course creation - data posting to backend', async () => {
    let token;
    let hint;
    try {
        hint = await getStaffProfileHint(token);
    }catch(error){
        hint = {
            org_id:'your-org-id',
            role:'admin',
            home_ids:[],
            primary_home_id:null,
            email:'admin@test.com',
            hint_version:2,
        }
    }
    beforeAll(async () => {
        token = await getToken({
            email:import.meta.env.VITE_EMAIL,
            password:import.meta.env.VITE_PASSWORD
        })
    })
    it.each(testCases)(
        'Posting data to the backend, table driven: case $index',
        async({d}) => {
            const secureDataGatewayPayload = {
                entity:'TrainingRequirement',
                operation:'create',
                data:d,
                _hint:hint
            };
            const res = await fetch(`${API_BASE}/functions/secureDataGateway`,{
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    'Authorization':`Bearer ${token}`
                },
                body:JSON.stringify(secureDataGatewayPayload)
            })
            const data = await res.json();
            expect(data.data.data.course_name).toBe(d.course_name)
            expect(data.status).toBe('success')
        }
    )
})