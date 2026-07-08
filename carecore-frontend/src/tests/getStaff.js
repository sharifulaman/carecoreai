import {getToken} from "@/tests/getToken"
const API_BASE =('http://localhost:8080').replace(/\/$/,'');

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
export const getStaff = async () => {
    const token = await getToken({
        email:email,
        password:password
    });
     const response = await fetch(`${API_BASE}/entities/StaffProfile?status=active&role=team_leader`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
  const { data: [firstStaff] } = await response.json();
  
  return firstStaff;
}