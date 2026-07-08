// @vitest-environment node
import {describe, it, expect, beforeAll} from "vitest"
import {addVacancy} from "@/tests/vacancy.js"
import {getToken} from "@/tests/getToken"
import {getHomeWithName, getHome} from "@/tests/getHome"
import { base44 } from "@/api/base44Client" 

const email = import.meta.env.VITE_EMAIL
const password = import.meta.env.VITE_PASSWORD
let homeName = {};
let homeID = "";

beforeEach(() => {
    global.sessionStorage = {
        _data: {},
        getItem(key) {return this._data[key] || null},
        setItem(key, value) {this._data[key] = value},
        removeItem(key) {delete this._data[key]},
        clear(){this._data = {}}
    }
})

describe("Vacancy test", () => {
    beforeAll(async () => {
        const token = await getToken({
            email:email,
            password:password
        })
        base44.setToken(token)
    })
    it('Checking data creation successful after calling the post function', async () => {
        homeName = await getHomeWithName();
        homeID = await getHome();
        const formData = {
            vacancy_role:"test_role_from_code",
            is_support_role:true,
            home_name:homeName,
            recruiting_manager_name:"test_name",
            salary_or_hourly_rate:55.5,
            application_received:0,
            interviews_scheduled:0,
            home_id:homeID,
            service_type:"test_service",
            accomodation_category:"test_category",
            number_of_posts:111,
            employment_type:"permanent",
            contract_hours:11.2,
            pay_type:"usd",
            vacancy_opened_date: new Date('2026-06-20T10:30:00'),
            target_start_date: new Date('2026-06-20T10:30:00'),
            reason_for_vacancy:"test vacancy",
            reason_details:"test details",
            recruiting_manager_id:"1",
            notes:"test notes",
            status:"test status"
        };

        const result = await addVacancy({
            vacancy_role:formData.vacancy_role,
            is_support_role:formData.is_support_role,
            home_id:formData.home_id,
            service_type:formData.service_type,
            accomodation_category:formData.accomodation_category,
            number_of_posts:formData.number_of_posts,
            employment_type:formData.employment_type,
            contract_hours:formData.contract_hours,
            status:formData.status,
            pay_type:formData.pay_type,
            vacancy_opened_date:formData.vacancy_opened_date,
            target_start_date:formData.target_start_date,
            reason_for_vacancy:formData.reason_for_vacancy,
            reason_details:formData.reason_details,
            recruiting_manager_id:formData.recruiting_manager_id,
            recruiting_manager_name:formData.recruiting_manager_name,
            notes:formData.notes,
            home_name:formData.home_name,
            salary_or_hourly_rate:formData.salary_or_hourly_rate,
            applications_received:formData.application_received,
            interviews_scheduled:formData.interviews_scheduled

        })
        expect(result.home_id).toBe(formData.home_id)
        expect(result.salary_or_hourly_rate).toBe(formData.salary_or_hourly_rate)
    } )
})