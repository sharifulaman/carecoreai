import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome} from "@/tests/getHome";
import {getToken} from "@/tests/getToken";
import {getStaff} from "@/tests/getStaff";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

const priorities = [
    "low",
    "high",
    "medium",
    "urgent"
];


const payload = [
    {
    org_id:"1",
    handover_id:"1",
    home_id:"",
    title:"test title",
    description:"test description",
    priority:priorities[3],
    due_at: new Date('2026-06-24t11:30:00'),
    assigned_to_name:"",
},
{
    org_id:"1",
    handover_id:"1",
    home_id:"",
    title:"test title",
    description:"test description",
    priority:priorities[3],
    due_at: new Date('2026-06-24t11:30:00'),
    assigned_to_name:"",
},
{
}
];
const testCases = payload.map((d, index) => ({
    index: index + 1,
    data:d
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

describe("Add task", () => {
    beforeAll(
        async() => {
            const token = await getToken({
                email:email,
                password:password
            })
            base44.setToken(token)
        }
    )
    it.each(testCases)(
        "Posting data, case: $index",
        async({data}) => {
            if(Object.hasOwn(data, "home_id")) {
                if(Object.hasOwn(data, "assigned_to_name")){
                    const homeID = await getHome();
                    data.home_id = homeID;
                    const staff = await getStaff();
                    data.assigned_to_name = staff.full_name;
                    const response = await base44.entities.HandoverTask.create(data);
                    console.log("Response: ", response);
                    expect(response.home_id).toBe(homeID);
                    expect(response.assigned_to_name).toBe(staff.full_name);
                } else {
                    const homeID = await getHome();
                    data.home_id = homeID;
                    const response = await base44.entities.HandoverTask.create(data);
                    console.log("Response: ", response);
                    expect(response.home_id).toBe(homeID);
                }
            } else {
                const response = await base44.entities.HandoverTask.create(data);
                console.log("Response: ", response);
            }
        }
    )

})
