import { base44 } from "@/api/base44Client";

export const addVacancy = async ({
  vacancy_role,
  is_support_role,
  home_name,
  recruiting_manager_name,
  salary_or_hourly_rate,
  applications_received,   
interviews_scheduled,    
  home_id,
  service_type,
  accommodation_category,  
  number_of_posts,
  employment_type,
  contract_hours,
  pay_type,
  vacancy_opened_date,
  target_start_date,
  reason_for_vacancy,
  reason_details,
  recruiting_manager_id,
  notes,
  status
}) => {
  const response = await base44.entities.Vacancy.create({
    vacancy_role,
    is_support_role,
    home_id,
    service_type,
    accommodation_category,   
    number_of_posts,
    employment_type,
    contract_hours,
    status,
    pay_type,
    vacancy_opened_date,
    target_start_date,
    reason_for_vacancy,
    reason_details,
    recruiting_manager_id,
    recruiting_manager_name,
    notes,
    home_name,
    salary_or_hourly_rate: parseFloat(salary_or_hourly_rate),
    applications_received,    
    interviews_scheduled,
  });


  return response;
};