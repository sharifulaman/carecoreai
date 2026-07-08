import {base44} from "@/api/base44Client"
import {describe, it, expect, beforeAll} from "vitest";
import {getToken} from "@/tests/getToken"
import {getStaff} from "@/tests/getStaff"
import {secureGateway} from "@/lib/secureGateway"

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
const randomInt = Math.floor(Math.random() * 3);
const randomIntTwo = Math.floor(Math.random() * 2);

const movementType = [
    "New Starter",
    "Leaver",
    "Role Change",
    "Service Reassignment"
];

const accomodation_category_affected = [
    "self-contained",
    "shared ring-fenced",
    "shared non-ring-fenced"
];

const payload = [
    {
    org_id:"1",
    staff_id:"1",
    staff_name:"Test",
    staff_role:"Test role",
    movement_type:movementType[randomInt],
    movement_date:new Date('2026-06-22t16:00:00'),
    is_support_role:true,
    previous_role:"test role",
    new_role:"test new role",
    previous_home_id:"1123",
    previous_home_name:"Test home",
    new_home_id:"9909",
    new_home_name:"test new home",
    accomodation_category_affected:accomodation_category_affected[randomIntTwo],
    reason: "test reason"
},
{
    org_id:"1",
    staff_id:"1",
    staff_name:"Test",
    staff_role:"Test role",
      movement_type:movementType[randomInt],
    movement_date:new Date('2026-06-22t16:00:00'),
    is_support_role:true,
    previous_role:"test role",
    new_role:"test new role",
    previous_home_id:"1123",
    previous_home_name:"Test home",
    accomodation_category_affected:accomodation_category_affected[randomIntTwo],

}
];

const testCases = payload.map((d, index) => ({
    index:index + 1,
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
describe("Record movement test", () => {
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
        "Running table driven tests",
        async({data}) => {
            const staff = await getStaff();
            // console.log( staff)
            data.staff_id = staff.id;
            data.staff_name = staff.full_name;
            data.staff_role = staff.role;
            const response = await secureGateway.create("StaffMovement", data)
         expect(response.new_role).toBe(data.new_role)
        expect(response.movement_type).toBe(data.movement_type)
        expect(response.staff_id).toBe(data.staff_id)
        expect(response.staff_name).toBe(data.staff_name)
        expect(response.staff_role).toBe(data.staff_role)
        }
    )
})