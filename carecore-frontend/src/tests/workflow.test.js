import {describe, it, expect, beforeAll} from "vitest";
import {getHome, getHomeWithName} from "@/tests/getHome";
import {getToken} from "@/tests/getToken";
import {base44} from "@/api/base44Client";

const email = import.meta.env.VITE_EMAIL
const password = import.meta.env.VITE_PASSWORD
let homeID = ""
let homeName = ""

const workflowType = [
    "incident review",
    "missing episode review",
    "support plan review",
    "visit report review"
];
const priority = [
    "low",
    "medium",
    "high"
];

const payload = [
    {
            workflow_type:workflowType[1],
            home_id:"",
            home_name:"",
            priority:priority[2],
            description:"test description",
            title:"test title",
            maker_name:"Test maker"
    },
    {
            workflow_type:workflowType[2],
            home_id:"",
            home_name:"",
            priority:priority[0],
            description:"test description",
            title:"test title",
            maker_name:"Test maker"
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

describe("Workflow test", () => {
    beforeAll(async() => {
        const token = await getToken({
            email:email,
            password:password
        })
        base44.setToken(token)
    })
    it("Posting to database", async() => {
        homeID = await getHome();
        homeName = await getHomeWithName();
        const response = await base44.workflow.create({
            workflow_type:workflowType[1],
            home_id:homeID,
            home_name:homeName,
            priority:priority[2],
            description:"test description",
            title:"test title",
            maker_name:"Test maker"
        })
      
        expect(response.workflow_type).toBe(workflowType[1])
        expect(response.home_name).toBe(homeName)
    })
    it.each(testCases)(
        "Posting multiple data at once",
        async({data}) => {
            homeID = await getHome();
            homeName = await getHomeWithName();
            data.home_id = homeID;
            data.home_name = homeName;
            const response = await base44.workflow.create({
                workflow_type:data.workflow_type,
                home_id:data.home_id,
                home_name:data.home_name,
                priority:data.priority,
                description:data.description,
                title:data.title,
                maker_name:data.maker_name
            })
             expect(response.workflow_type).toBe(data.workflow_type)
        expect(response.home_name).toBe(data.home_name)
        }
    )
})