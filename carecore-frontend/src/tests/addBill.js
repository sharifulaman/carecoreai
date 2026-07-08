import {base44} from "@/api/base44Client";

export const addBill = async({
    home_id,
    supplier,
    bill_type,
    amount,
    due_date,
    paid_date,
    status,
    notes,
    home_name,
    is_direct_debit,
    is_recurring,
   
    org_id
}) => {
    const response = await base44.entities.Bill.create({
        org_id:org_id,
        supplier:supplier,
        bill_type:bill_type,
        due_date:due_date,
        status:status,
        notes:notes,
        home_id:home_id,
        amount:parseFloat(amount),
        home_name:home_name,
        is_direct_debit:is_direct_debit,
        is_recurring:is_recurring,
        paid_date:paid_date
    })
    return response;

}