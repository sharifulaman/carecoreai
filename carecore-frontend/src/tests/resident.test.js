import { base44 } from "@/api/base44Client";
import { createNotification } from "@/lib/createNotification";
import {describe, it, expect, beforeAll} from 'vitest';

import { getToken } from "@/tests/getToken";
import { secureGateway } from "@/lib/secureGateway";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

const payload = [
  {
                    org_id: "1234",
                    home_id: "1234",
                    home_name: "Test name from IDE",
                    home_address: "Test address",
                    resident_id: "",
                    resident_name:  "test",
                    notice_type: "admission",
                    child_name: "test child name",
                    child_dob: new Date('2026-06-21t13:30:00'),
                    accommodating_authority_name: "test authority name",
                    iro_or_pa_name: "test name",
                    iro_or_pa_contact: "test contact",
                    admission_date: new Date('2026-06-21t13:30:00'),
                    status: "draft",
                    created_by_id: "",
                    created_by_name: "",
                  },
                  {
                    org_id: "1234",
                    home_id: "1234",
                    home_name: "Test name from IDE",
                    home_address: "Test address",
                    resident_id: "",
                    resident_name:  "test",
                    notice_type: "admission",
                    child_name: "test child name",
                    child_dob: new Date('2026-06-21t13:30:00'),
                    accommodating_authority_name: "test authority name",
                    iro_or_pa_name: "test name",
                    iro_or_pa_contact: "test contact",
                    admission_date: new Date('2026-06-21t13:30:00'),
                    status: "draft",
                    created_by_id: "",
                    created_by_name: "",
                  }
];
const testCases = payload.map((d,index) => ({
  index:index + 1,
  d:d
}))
 describe("Testing residents",  () => {
  beforeEach(() => {
    global.sessionStorage = {
      _data: {},
      getItem(key) { return this._data[key] || null; },
      setItem(key, value) { this._data[key] = value; },
      removeItem(key) { delete this._data[key]; },
      clear() { this._data = {}; }
    };
  });
  beforeAll(async () => {
    const token = await getToken({email, password});
    base44.setToken(token);
   
  })
  it('Testing staffs', async () => {

    const data = await secureGateway.filter("StaffProfile")
    const response =  await secureGateway.create("AdmissionDischargeNotice", {
                    org_id: "1234",
                    home_id: "1234",
                    home_name: "Test name from IDE",
                    home_address: "Test address",
                    resident_id: data[0].id,
                    resident_name:  "test",
                    notice_type: "admission",
                    child_name: "test child name",
                    child_dob: new Date('2026-06-21t13:30:00'),
                    accommodating_authority_name: "test authority name",
                    iro_or_pa_name: "test name",
                    iro_or_pa_contact: "test contact",
                    admission_date: new Date('2026-06-21t13:30:00'),
                    status: "draft",
                    created_by_id: data[0].id,
                    created_by_name: data[0].full_name,
                  });
                  const homeStaff = data.filter(s =>[
                    "team_leader", "admin_officer", "admin_manager"
                  ].includes(s.role) && s.user_id &&           ((s.home_ids)));
                   for (const s of homeStaff) {
                                  await createNotification({
                                    recipient_user_id: s.user_id,
                                    org_id: "1234",
                                    title: `Reg 28 Notice Required — admitted`,
                                    body: `A written admission notice must be sent to the local authority for the area where ${"the home"} is located. Open the Reg 28 log to complete and record this.`,
                                    type: "general",
                                    link: "/compliance-hub?report=reg28",
                                    priority: "high",
                                  });
                                }
                                expect(response.home_name).toBe("Test name from IDE")
                                expect(response.notice_type).toBe("admission")

  });
  it.each(testCases)(
    "Posting data in table driven approach: $index",
    async({d}) => {
       const data = await secureGateway.filter("StaffProfile")
       d.resident_id = data[0].id;
       d.created_by_id = data[0].id;
       d.created_by_name = data[0].name;
     
       const response = await secureGateway.create("AdmissionDischargeNotice",d)
      

    }
  )
})
