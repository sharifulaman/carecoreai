// Incidents & concerns,Health & Medication, Environments tabs' functions -> Add concern, Add medication Note and Add Note are calling same functions respectively.
import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome} from "@/tests/getHome";
import {getToken} from "@/tests/getToken";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

const severities = [
    "low",
    "medium",
    "high",
    "critical"
];

const payload = [
    {
        org_id: "112",
        handover_id: "432",
        home_id: "",
        update_type: "concern",
        title: "test title",
        description: "test description",
        priority: severities[0],
        assigned_to_name:"Author name",
        due_at:new Date('2026-06-24t13:17:00'),
        completed_at:new Date('2026-06-24t13:17:00'),
        passed_to_next_shift:true,
    },
    {
        org_id: "112",
        handover_id: "432",
        home_id: "",
        update_type: "concern",
        title: "test title",
        description: "test description",
        priority: severities[2],
        assigned_to_name:"Author name",
        due_at:new Date('2026-06-24t13:17:00'),
        completed_at:new Date('2026-06-24t13:17:00'),
        passed_to_next_shift:true,
    },
    {
        org_id: "112",
        handover_id: "432",
        // home_id: "",
        // update_type: "concern",
        // title: "test title",
        // description: "test description",
        // priority: severities[3],
        // assigned_to_name:"Author name",
        // due_at:new Date('2026-06-24t13:17:00'),
        // completed_at:new Date('2026-06-24t13:17:00'),
        // passed_to_next_shift:true,
    },
    {}
];
const testCases = payload.map((d, index) => ({
    index:index + 1,
    data:d,
}))

beforeEach(() => {
    global.sessionStorage = {
        _data:{},
        getItem(key){return this._data[key] || null},
        setItem(key, value){this._data[key] = value},
        removeItem(key){delete this._data[key]},
        clear(){this._data = {}}

    };
})

describe("Add concern", () => {
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
                        const homeID = await getHome();
                        data.home_id = homeID;
                        const response = await base44.entities.HandoverTask.create(data);
                        expect(response.home_id).toBe(homeID);
                } else {
                    const response = await base44.entities.HandoverTask.create(data);
                    expect(response.created_by).toBe(import.meta.env.VITE_EMAIL)
                }
            }
        )
})