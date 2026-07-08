import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome} from "@/tests/getHome";
import {getResident} from "@/tests/getResident";
import {getToken} from "@/tests/getToken";
import {secureGateway} from "@/lib/secureGateway";


const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;



const payload = {
    org_id:"12",
    resident_id:"999",
    resident_name:"Test resident name",
    home_id:"",
    created_by_id:"eswer",
    created_by_name:"user",
    status:"active",
    version:1,
    // form data starts from here
    resident_id:  "",
    personal_adviser_name: "",
    personal_adviser_contact: "",
    effective_date: new Date().toISOString().split("T")[0],
    review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    health_and_development: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    education_training_employment: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    financial_capability: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    accommodation: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "", planned_accommodation_at_18: "", accommodation_identified: false, address: "", tenancy_support_needed: false },
    family_and_social_relationships: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    identity_and_self_care: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    emotional_and_behavioural_development: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    contingency_plan: "",
    young_person_consulted: false,
    young_person_agrees: false,
    young_person_goals: "",
    young_person_concerns: "",
}

const data = [
    {
    org_id:"12",
    resident_id:"999",
    resident_name:"Test resident name",
    home_id:"",
    created_by_id:"eswer",
    created_by_name:"user",
    status:"active",
    version:1,
    // form data starts from here
    resident_id:  "",
    personal_adviser_name: "",
    personal_adviser_contact: "",
    effective_date: new Date().toISOString().split("T")[0],
    review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    health_and_development: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    education_training_employment: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    financial_capability: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    accommodation: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "", planned_accommodation_at_18: "", accommodation_identified: false, address: "", tenancy_support_needed: false },
    family_and_social_relationships: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    identity_and_self_care: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    emotional_and_behavioural_development: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    contingency_plan: "",
    young_person_consulted: false,
    young_person_agrees: false,
    young_person_goals: "",
    young_person_concerns: "",
},
{
    org_id:"12",
    resident_id:"999",
    resident_name:"Test resident name",
    home_id:"test id",
    created_by_id:"eswer",
    created_by_name:"user",
    status:"active",
    version:1,
    // form data starts from here
    resident_id:  "",
    personal_adviser_name: "",
    personal_adviser_contact: "",
    effective_date: new Date().toISOString().split("T")[0],
    review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    health_and_development: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    education_training_employment: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    financial_capability: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    accommodation: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "", planned_accommodation_at_18: "", accommodation_identified: false, address: "", tenancy_support_needed: false },
    family_and_social_relationships: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    identity_and_self_care: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    emotional_and_behavioural_development: { current_situation: "", needs: "", support_planned: "", who_responsible: "", target_date: "" },
    contingency_plan: "",
    young_person_consulted: false,
    young_person_agrees: false,
    young_person_goals: "",
    young_person_concerns: "",
}
];
const testCases = data.map((d, index) => ({
    index: index + 1,
    data: d
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

describe("Add plan", () => {
    beforeAll(
        async () => {
            const token = await getToken({
                email:email,
                password:password
            })
            base44.setToken(token)
        }
    )
    it("Posting data to backend", async () => {
        const response = await secureGateway.create("PathwayPlan", payload)
        
    })
    it.each(testCases)(
        "Posting, object: $index",
        async({data}) => {
            const homeID = await getHome();
            data.home_id = homeID;
            const residents = await getResident();
            const selectedResident = residents.find((r) => r.initials == "AT");
            data.resident_id = selectedResident.id;
            data.resident_name = selectedResident.display_name;
            const response = await secureGateway.create("PathwayPlan", data);
            console.log("Response:", response)
        }
    )
    
})