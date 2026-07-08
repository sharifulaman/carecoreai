import {base44} from "@/api/base44Client";
import {describe, it, expect, beforeAll} from "vitest";
import {getHome, getHomeWithName} from "@/tests/getHome"
import {getToken} from "@/tests/getToken";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
let homeID = "";
let homeName = "";

const payload = {
    org_id:"default",
    name:"test name",
    home_id:"",
    home_name:"",
    asset_name:"test asset",
    category:"test category",
    purchase_date:new Date('2026-06-22t17:42:00'),
    supplier:"test supplier",
    status:"active",
    location_in_home:"test home",
    serial_number:"1121",
    asset_id:"9909",
    warranty_expiry:new Date('2026-06-28t17:42:00'),
    assigned_room:"Test assigned room",
    condition:"good",
    purchase_cost:parseFloat(556.699),
    notes:"test notes",
    photo_url:"test url",
    value:50.0

};

const assetData = [
    {
    org_id:"default",
    name:"test name",
    home_id:"",
    home_name:"",
    asset_name:"test asset",
    category:"test category",
    purchase_date:new Date('2026-06-22t17:42:00'),
    supplier:"test supplier",
    status:"active",
    location_in_home:"test home",
    serial_number:"1121",
    asset_id:"9909",
    warranty_expiry:new Date('2026-06-28t17:42:00'),
    assigned_room:"Test assigned room",
    condition:"good",
    purchase_cost:parseFloat(556.699),
    notes:"test notes",
    photo_url:"test url",
    value:50.0

},
{
    org_id:"default",
    name:"test name",
    home_id:"",
    home_name:"",
    asset_name:"test asset",
    category:"test category",
    purchase_date:new Date('2026-06-22t17:42:00'),
    supplier:"test supplier",
    status:"active",
    location_in_home:"test home",
    serial_number:"1121",
    asset_id:"9909",
    warranty_expiry:new Date('2026-06-28t17:42:00'),
    assigned_room:"Test assigned room",
    condition:"good",
    purchase_cost:parseFloat(556.699),
    notes:"test notes",
    photo_url:"test url",
    value:50.0

}   
];
const testCases = assetData.map((d, index) => ({
    index: index + 1,
    data:d
}))
beforeEach(() => { 
    global.sessionStorage = {
        _data:{},
        getItem(key){return this._data[key] || null},
        setItem(key, value){this._data[key] = value},
        removeItem(key) {delete this._data[key]},
        clear(){this._data = {}}
    }
})

describe("Add asset test", () => {
    beforeAll(
        async () => {
            const token = await getToken({
                email:email,
                password:password
            })
            base44.setToken(token)
        }
    )
    it('Adding data to backend', async() => {
        homeID = await getHome();
        homeName = await getHomeWithName();
        payload.home_id = homeID;
        payload.home_name = homeName;
        const response = await base44.entities.HomeAsset.create(payload);
       
        expect(response.home_id).toBe(homeID);
        expect(response.home_name).toBe(homeName)
    })
    it.each(testCases)(
        "Adding table driven test case",
        async({data}) => {
            // const homeID = await getHome();
            // const homeName = await getHomeWithName();
            data.home_id = homeID;
            data.home_name = homeName;
            const response = await base44.entities.HomeAsset.create(data);
            expect(response.home_id).toBe(homeID);
            expect(response.home_name).toBe(homeName)
        }
    )
    
})