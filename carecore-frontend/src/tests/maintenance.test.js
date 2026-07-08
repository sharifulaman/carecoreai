// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { addMaintenance } from './maintenance'
import { base44 } from "@/api/base44Client" 
import axiosInstance from "@/api/axiosInstance";
import {getToken} from "./getToken"
import {getHome} from "@/tests/getHome"

let homeID = "";
const homes = [
   {
    org_id: "1", 
    name: "Ryan Momo Nibash",
},
//   {
//     org_id: "2", 
//     name: "Ryan Momo Nibash Two",
// }
]


const forms = [
    {
    home_id: "1",
    title: "Test Issue Title",
    category: "Plumbing",
    priority: "High",
    description: "This is a mandatory description field for the live database.", // 
    date_reported: new Date().toISOString().split('T')[0],
    reported_by_name: "Test user",
    photo_url: "Test photo url",
},
//   {
//     home_id: "2",
//     title: "Test Issue Title 2",
//     category: "Plumbing",
//     priority: "High",
//     description: "This is a mandatory description field for the live database.", // 
//     date_reported: new Date().toISOString().split('T')[0],
//     reported_by_name: "Test user 2",
//     photo_url: "Test photo url"
// }
]
const formsNew = [
   {
  
    category: "Missing inputs test",
    priority: "High",
    
},
//   {
  
//     category: "Missing inputs",
//     priority: "High",
   
// }
]
const staffProfiles = [
    { full_name: "test_test" },
    // { full_name: "test_test_2" },

]
const users = [
     { full_name: "Test user" },
    //   { full_name: "Test user 2" }
]

const testCases = homes.map((home, index) => ({
    index:index + 1,
    home:home,
    form:forms[index],
    staffProfile:staffProfiles[index],
    user:users[index]
}))
const testCasesNew = homes.map((home, index) => ({
    index:index + 1,
    home:home,
    formsNew:formsNew[index],
    staffProfile:staffProfiles[index],
    user:users[index]
}))

// Please write your credentials here
const email = import.meta.env.VITE_EMAIL
const password= import.meta.env.VITE_PASSWORD
beforeEach(() => {
  global.sessionStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null },
    setItem(key, value) { this._data[key] = value },
    removeItem(key) { delete this._data[key] },
    clear() { this._data = {} },
  }
})

describe("Maintenance test", () => {
    
   beforeAll(async () => {
   
    const token = await getToken({
        email:email,
        password:password
    })
    homeID = await getHome();
    
    

    base44.setToken(token); 
   
});
it.each(testCases)(
    'Checking object creation successful, case $index',
    async({home, form, staffProfile, user}) => {
       
       
        form.home_id = homeID;
        const result = await addMaintenance({
            form:form,
            home:home,
            staffProfile:staffProfile,
            user:user
        })
        const {home_name, description} = result;
        expect(home_name).toBe(home.name)
        expect(description).toBe(form.description)
    }
)
it.each(testCasesNew)(
    'Checking object creation when some of the required fields are missing, case $index',
    async({home, formsNew, staffProfile, user}) => {
   
        formsNew.home_id = homeID;
        const result = await addMaintenance({
            form:formsNew,
            home:home,
            staffProfile:staffProfile,
            user:user
          
        })
        const {home_name} = result;
        expect(home_name).toBe(home.name)
    }
)
});