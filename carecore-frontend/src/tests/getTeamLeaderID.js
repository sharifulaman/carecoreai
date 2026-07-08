import {getToken} from "@/tests/getToken"
export const getTeamLeaderID = async() => {
    const token = await getToken({
        email:import.meta.env.VITE_EMAIL,
        password:import.meta.env.VITE_PASSWORD
    });
    const apiBase = process.env.VITE_API_URL || "http://localhost:8080";
 const response = await fetch(`${apiBase}/entities/StaffProfile?status=active&role=team_leader`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
const tID = data.data[0].id;
return tID;

}