import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import { format } from "date-fns";
import {getHome} from "@/tests/getHome";
import {getToken} from "@/tests/getToken";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
const randomIntOne = Math.floor(Math.random() * 4);
const randomIntTwo = Math.floor(Math.random() * 3)
const updateType = [
    "daily overview",
    "highlights",
    "points to notes",
    "concerns",
    "requests"
]
const severity = [
    "low",
    "medium",
    "high",
    "critical"
];

const payload = [
    {
    org_id:"111",
    handover_id:"998",
    home_id:"",
    update_type:updateType[randomIntOne],
    title:"test title",
    summary:"test summary",
    severity:severity[randomIntTwo],
    recorded_at:format(new Date(), "HH:mm")

},
{
    org_id:"111",
    handover_id:"998",
    home_id:"",
    update_type:updateType[randomIntOne],
    title:"test title",
    summary:"test summary",
    severity:severity[randomIntTwo],
    recorded_at:format(new Date(), "HH:mm")

},
{
    org_id:"111",
    severity:severity[randomIntTwo],
    recorded_at:format(new Date(), "HH:mm")

},{

} 
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

describe("Posting data to backend", () => {
    beforeAll(
        async () => {
            const token = await getToken({
                email:email,
                password:password
            });
            base44.setToken(token)
        }
    )
  
    it.each(testCases)(
        "case: $index",
        async({data}) => {
            if(data.hasOwnProperty('home_id')) {
                const homeID = await getHome();

                data.home_id = homeID;
                 const response = await base44.entities.HandoverUpdate.create(
                data
            );
          expect(response.home_id).toBe(homeID);
          expect(response.handover_id).toBe(data.handover_id)
                      }else {
 const response = await base44.entities.HandoverUpdate.create(
                data
            );
            expect(response.org_id).toBe("default_org")  
            }
           
        }
    )
})