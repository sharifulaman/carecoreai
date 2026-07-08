import { base44 } from "@/api/base44Client";
import axiosInstance from "@/api/axiosInstance";
export const addMaintenance = async ({form,home, staffProfile, user}) => {
    const result = await base44.entities.MaintenanceLog.create({
        org_id:home.org_id || "",
        home_id:form.home_id,
        home_name:home?.name || "",
        title:form.title,
        category: form.category.toLowerCase().replace(/ \/ /g, "_").replace(/ /g, "_"),
        priority: form.priority.toLowerCase(),
        description: form.description,
        date_reported:form.date_reported,
        status:"reported",
        reported_by_name: form.reported_by_name || staffProfile?.full_name || user?.full_name || "",
        photo_url: form.photo_url,

    });
    return result;
   

}