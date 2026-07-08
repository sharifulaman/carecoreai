import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome, getHomeWithName} from "@/tests/getHome"
import {getToken} from "@/tests/getToken"

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
let homeID = ""
let homeName = ""

const payload = [
  {
            org_id:"199",
            home_id:homeID,
            home_name:homeName,
            applies_to_all_homes:false,
            schedule_title:"Test title from IDE",
            category:"test category",
            maintenance_type:"Test maintenance type",
            frequency:"yearly",
            start_date: new Date().toISOString().slice(0,10),
            next_due_at: new Date('2026-06-21t13:30:00'),
            assigned_to_name:"Test name",
            contractor_name:"Test contractor name",
            estimated_cost: parseFloat(99.9),
            reminded_days_before:parseInt(7),
            notes:"Test notes",
            status:"active",
            created_by_name:"Admin"
        },
          {
            org_id:"199",
            home_id:homeID,
            home_name:homeName,
            applies_to_all_homes:false,
            schedule_title:"Test title from IDE",
            category:"test category",
            maintenance_type:"Test maintenance type",
            frequency:"yearly",
            start_date: new Date().toISOString().slice(0,10),
            next_due_at: new Date('2026-06-21t13:30:00'),
            assigned_to_name:"Test name",
            contractor_name:"Test contractor name",
            estimated_cost: parseFloat(99.9),
            reminded_days_before:parseInt(7),
            notes:"Test notes",
            status:"active",
            created_by_name:"Admin"
        }
];
const testCases = payload.map((p, index) => ({
    index:index + 1,
    p:p
}))

beforeEach(() => {
    global.sessionStorage = {
        _data:{},
        getItem(key){return this._data[key] || null},
        setItem(key, value){this._data[key] = value},
        removeItem(key){delete this._data[key]},
        clear(){this._data = {}}
    }
})
describe("Add schedule test", () => {
    beforeAll(
        async() => {
            const token = await getToken({
                email:email,
                password:password
            })
            base44.setToken(token)
        }
    )
    it("Posting data to database", async() => {
        homeID = await getHome();
        homeName = await getHomeWithName()
        const response = await base44.entities.MaintenanceSchedule.create(
            {
            org_id:"199",
            home_id:homeID,
            home_name:homeName,
            applies_to_all_homes:false,
            schedule_title:"Test title from IDE",
            category:"test category",
            maintenance_type:"Test maintenance type",
            frequency:"yearly",
            start_date: new Date().toISOString().slice(0,10),
            next_due_at: new Date('2026-06-21t13:30:00'),
            assigned_to_name:"Test name",
            contractor_name:"Test contractor name",
            estimated_cost: parseFloat(99.9),
            reminded_days_before:parseInt(7),
            notes:"Test notes",
            status:"active",
            created_by_name:"Admin"
        }
    )
        expect(response.schedule_title).toBe("Test title from IDE")
        expect(response.home_id).toBe(homeID)

    })
    it.each(testCases)(
        'Posting data to database: table driven approach: $index',
        async({p}) => {
                homeID = await getHome();
        homeName = await getHomeWithName()
        p.home_id = homeID;
        p.home_name = homeName;
            const response = await base44.entities.MaintenanceSchedule.create(
                p
            );
            expect(response.schedule_title).toBe('Test title from IDE')
            expect(response.home_id).toBe(homeID)
        }
    )
})