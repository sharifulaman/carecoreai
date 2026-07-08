import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome, getHomeWithName} from "@/tests/getHome";
import {getToken} from "@/tests/getToken";
import {secureGateway} from "@/lib/secureGateway";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

const payload = [
    {
    org_id:"123",
    home_id:"",
    home_name:"",
    recorded_by_id:"",
    recorded_by_name:"",
    visit_date:new Date().toISOString().split("T")[0],
    arrival_time:new Date().toLocaleTimeString("en-GB",{
        hour:"2-digit",
        minute:"2-digit"
    }),
    visitor_name:"Test visitor",
    visitor_organisation:"test organisation",
    visitor_relationship:"test relationship",
    purpose_of_visit:"test purpose",
    resident_visited_id:"test resident",
    resident_visited_name:"test resident name",
    dbs_checked:true,
    dbs_check_date:"",
    staff_who_authorised:"",
    any_concerns:false,
    concern_notes:"test notes",
    signed_in:true
},
{
    org_id:"123",
    home_id:"",
    home_name:"",
    recorded_by_id:"",
    recorded_by_name:"",
    visit_date:new Date().toISOString().split("T")[0],
    arrival_time:new Date().toLocaleTimeString("en-GB",{
        hour:"2-digit",
        minute:"2-digit"
    }),
    visitor_name:"Test visitor",
    visitor_organisation:"test organisation",
    visitor_relationship:"test relationship",
    purpose_of_visit:"test purpose",
    resident_visited_id:"test resident",
    resident_visited_name:"test resident name",
    dbs_checked:true,
    dbs_check_date:"",
    staff_who_authorised:"",
    any_concerns:false,
    concern_notes:"test notes",
    signed_in:true
},{}
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
    }
})
describe("Add signed in visitor", () => {
    beforeAll(
        async () => {
            const token = await getToken({
                email:email,
                password:password
            });
            base44.setToken(token);

        }
    )
    it.each(testCases)(
        "Posting data. Data no: $index",
        async({data}) => {
            if(data.home_id != null && data.home_name != null){
                const homeID = await getHome();
                const homeName = await getHomeWithName();
                data.home_id= homeID;
                data.home_name = homeName;
                const response = await secureGateway.create("VisitorLog", data)
                expect(response.home_id).toBe(homeID);
                expect(response.home_name).toBe(homeName)

            } else {
                const response = await secureGateway.create("VisitorLog", data)
                
                
            }
        }
    )
})