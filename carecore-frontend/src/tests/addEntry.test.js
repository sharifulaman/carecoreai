import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome} from "@/tests/getHome";
import {getResident} from "@/tests/getResident";
import {getToken} from "@/tests/getToken";


const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
let homeID = "";

const data = [
    {
    org_id:"12",
    resident_id:"",
    resident_name:"",
    home_id:"",
    staff_id:"test",
    workder_id:"",
    worker_name:"",
    recorded_by_role:"Staff",
    date: new Date('2026-06-23t11:29:00'),
    title:"test title",
    summary:"test summary",
    details:"test details",
    log_type:"test log type",
    mood:"test mood",
    risk_level:"high",
    visibility:"high",
    status:"test status",
    tags:["1", "2", "3"],
    follow_up_required:false,
    follow_up_due_date: new Date('2026-06-24t11:29:00'),
    source_module:"daily_logs",
    source_entity_type:"manual_daily_log",
    is_auto_generated:false,
    requires_manager_review:["High", "Critical"],
    review_status:"Pending"
},
  {
    org_id:"12",
    resident_id:"",
    resident_name:"",
    home_id:"",
    staff_id:"test",
    workder_id:"",
    worker_name:"",
    recorded_by_role:"Staff",
    date: new Date('2026-06-23t11:29:00'),
    title:"test title",
    summary:"test summary",
    details:"test details",
    log_type:"test log type",
    mood:"test mood",
    risk_level:"high",
    visibility:"high",
    status:"test status",
    tags:["1", "2", "3"],
    follow_up_required:false,
    follow_up_due_date: new Date('2026-06-24t11:29:00'),
    source_module:"daily_logs",
    source_entity_type:"manual_daily_log",
    is_auto_generated:false,
    requires_manager_review:["High", "Critical"],
    review_status:"Pending"
}
];

const testCases = data.map((d, index) => ({
    index:index + 1,
    data:d
}))
beforeEach(() => {
    global.sessionStorage = {
        _data:{},
        getItem(key){return this._data[key] || null},
        setItem(key, value){this._data[key] = value},
        removeItem(key) {delete this._data[key]},
        clear(){this._data = {}}
    }
})

describe("Add entry", () => {
    beforeAll(
        async () => {
            const token = await getToken({
                email:email,
                password:password
            })
            base44.setToken(token)
        }
    )
 
    it.each(testCases)(
        "Posting data: table driven approach, case: $index",
        async({data}) => {
            homeID = await getHome();
            data.home_id = homeID;
            const residents = await getResident();
            const selectedResident = residents.find((r) => r.initials == "AT");
            data.resident_id = selectedResident.id;
            data.resident_name = selectedResident.display_name;
            data.worker_id = selectedResident.key_worker_id,
            data.worker_name = selectedResident.display_name

          
            const response = await base44.entities.DailyLog.create(data)
            expect(response.resident_id).toBe(data.resident_id)
            expect(response.resident_name).toBe(data.resident_name)
          
        }
    )
    it("Posting data with an empty payload", async() => {
        const response = await base44.entities.DailyLog.create({})
      
    })
})