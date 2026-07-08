import axiosInstance from "@/api/axiosInstance";
import { base44 } from "@/api/base44Client";

export async function signUp({email, password, confirmPassword}){
    try {
        const response = await base44.auth.register({
            email,
            password,
            full_name: email.split("@")[0] || "CareCore User",
            role:"support_worker"
        })
        console.log("Response: ", response)
      
        return response;
    }catch(error){
        
        return error
    }
}