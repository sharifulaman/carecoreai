import {addBank} from "@/tests/addAjency"
import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome, getHomeWithName} from "@/tests/getHome"
import {getToken} from "@/tests/getToken"

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
let homeID = ""
let homeName = ""

const data = [
    {
    usage_date:new Date().toISOString().split('T')[0],
    worker_name_or_reference: 'test worker',
    agency_bank_type:'test bank',
    agency_organisation_name:'test organisation',
    shift_home_id: '',
    service_type:'test service type',
    accomodation_category:'test category',
    hours_worked:parseFloat('4'),
    shift_start_time:new Date().toISOString().split('T')[0],
    shift_end_time: new Date('2026-06-21t13:30:00'),
    role:'test role',
    is_support_role:true,
    reason_used:'test reason',
    cost_per_hour:parseFloat(13.4),
    notes:'test notes',
    status:'pending',
    shift_home_name:''
},
{
    usage_date:new Date().toISOString().split('T')[0],
    worker_name_or_reference: 'test worker',
    agency_bank_type:'test bank',
    agency_organisation_name:'test organisation',
    shift_home_id: '',
    service_type:'test service type',
    accomodation_category:'test category',
    hours_worked:parseFloat('4'),
    shift_start_time:new Date().toISOString().split('T')[0],
    shift_end_time: new Date('2026-06-21t13:30:00'),
    role:'test role',
    is_support_role:true,
    reason_used:'test reason',
    cost_per_hour:parseFloat(13.4),
    notes:'test notes',
    status:'pending',
    shift_home_name:''
}
];
const testCases = data.map((d, index) => ({
    index:index + 1,
    d:d
}))



beforeEach(() => {
    global.sessionStorage = {
        _data:{},
        getItem(key) {return this._data[key] || null},
        setItem(key, value) {this._data[key] = value},
        removeItem(key) {delete this._data[key]},
        clear(){this._data = {}}
    }
})

describe('Add agency test', () => {
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
        'Posting data to database: case $index',
        async({d}) => {
        homeID = await getHome();
        homeName = await getHomeWithName()
        d.shift_home_id = homeID;
        d.shift_home_name = homeName;
        const response = await addBank({payload:d});
        expect(response.shift_home_id).toBe(homeID)
        expect(response.shift_home_name).toBe(homeName)   
        }
    )
})