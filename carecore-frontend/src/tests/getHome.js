import {getToken} from "@/tests/getToken"
export const getHome = async() => {
    const token = await getToken({
        email:import.meta.env.VITE_EMAIL,
        password:import.meta.env.VITE_PASSWORD
    });
    const apiBase = process.env.VITE_API_URL || "http://localhost:8080";
 const response = await fetch(`${apiBase}/entities/Home`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
const homeID = data.data[1].id;
return homeID;

}
export const getHomeWithName = async() => {
    const token = await getToken({
        email:import.meta.env.VITE_EMAIL,
        password:import.meta.env.VITE_PASSWORD
    });
    const apiBase = process.env.VITE_API_URL || "http://localhost:8080";
 const response = await fetch(`${apiBase}/entities/Home`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
const home = data.data[1].name;
return home;

}