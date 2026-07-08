import {addBill} from "@/tests/addBill";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome, getHomeWithName} from "@/tests/getHome"
import {getToken} from "@/tests/getToken";
import {base44} from "@/api/base44Client"

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
let homeID = ""
let homeName = ""

const formData = [
     {
            org_id:"1",
            supplier:"test supplier from test",
            bill_type:"test bill",
            due_date: new Date('2026-06-21t10:30:00'),
            status:'done',
            notes:'test notes',
            home_id:"",
            home_name:"",
            amount:44.5,
            paid_date:new Date('2026-06-21t10:30:00'),
            is_direct_debit:true,
            is_recurring:true,
        },
        {
            // org_id:"1",
            supplier:"test supplier from test",
            bill_type:"test bill",
            due_date: new Date('2026-06-21t10:30:00'),
            // status:'done',
            // notes:'test notes',
            home_id:"",
            home_name:"",
            amount:44.5,
            paid_date:new Date('2026-06-21t10:30:00'),
            is_direct_debit:true,
            is_recurring:true,
        }
];
const testCases = formData.map((d, index) => ({
    index: index + 1,
    data:d
  
}))

beforeEach(() => {
    global.sessionStorage = {
        _data: {},
        getItem(key) {return this._data[key] || null},
        setItem(key, value) {this._data[key] = value},
        removeItem(key) {delete this._data[key]},
        clear(){this._data = {}}
    }
})

describe("Add bill test", () => {
    beforeAll(async () => {
        const token = await getToken({
            email:email,
            password:password
        })
       base44.setToken(token)
    })
   
    it.each(testCases)(
        'Posting data to database: case $index',
        async({data}) => {
            homeID = await getHome();
            homeName = await getHomeWithName();
         
            const response = await addBill({
            org_id:data.org_id,
            supplier:data.supplier,
            bill_type:data.bill_type,
            due_date:data.due_date,
            status:data.status,
            notes:data.notes,
            home_id:homeID,
            amount:data.amount,
            home_name:homeName,
            paid_date:data.paid_date,
            is_direct_debit:data.is_direct_debit,
            is_recurring:data.is_recurring
        });
     
        expect(response.home_id).toBe(homeID)
        expect(response.home_name).toBe(homeName)
        }
    )
})