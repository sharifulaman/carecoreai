import {base44} from "@/api/base44client";
export const addBank = async({payload}) => {
    try {
        const response = await base44.entities.AgencyBankStaffUsage.create(payload);
        return response;
    } catch(e){
        return e;
    }
};