import {secureGateway} from "@/lib/secureGateway"
export const getResident = async () => {
    try {
        const response = await secureGateway.filter("Resident", { status: "active" });
        return response;
    } catch(e){
        return e.message;
    }
}