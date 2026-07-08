CREATE ROLE carecore LOGIN PASSWORD 'SoftwareLighthouseASDF';

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO carecore;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carecore;

-- Make it the default for future tables too (created by migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO carecore;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO carecore;

GRANT USAGE, CREATE ON SCHEMA public TO carecore;

  DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I OWNER TO carecore', r.tablename);
    END LOOP;
END $$;


DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE public.%I OWNER TO carecore', r.sequence_name);
    END LOOP;
END $$;

-- Helper function so every policy is consistent
CREATE OR REPLACE FUNCTION current_org_id() RETURNS text AS $$
  SELECT current_setting('app.current_org', true)
$$ LANGUAGE sql STABLE;

-- Query to generate the SQL statements to enable RLS and create the tenant isolation policy for all tables with an org_id column in the public schema.
  SELECT
  format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name) || E'\n' ||
  format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', table_name) || E'\n' ||
  format('CREATE POLICY tenant_isolation ON %I FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());', table_name)
FROM information_schema.columns
WHERE column_name = 'org_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- Output of the above query can be used to enable RLS and create the tenant isolation policy for all tables with an org_id column in the public schema.

ALTER TABLE accident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE accident_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON accident_reports FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON achievements FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE admission_discharge_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_discharge_notices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON admission_discharge_notices FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE advocacy_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE advocacy_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON advocacy_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE agency_bank_staff_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_bank_staff_usages FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agency_bank_staff_usages FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appointments FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE appraisal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appraisal_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON approval_workflows FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attendance_logs FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_trails FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON auth_users FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE behaviour_support_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE behaviour_support_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON behaviour_support_plans FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON bills FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE body_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_maps FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON body_maps FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE care_leaver_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_leaver_benefits FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON care_leaver_benefits FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE cic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cic_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON cic_reports FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON complaints FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON contract_templates FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE council_tax_exemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_tax_exemptions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON council_tax_exemptions FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON daily_logs FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE deprivation_of_liberties ENABLE ROW LEVEL SECURITY;
ALTER TABLE deprivation_of_liberties FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON deprivation_of_liberties FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE disciplinary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinary_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON disciplinary_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE employee_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_locations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employee_locations FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE employment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON employment_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE exploitation_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exploitation_risks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON exploitation_risks FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE external_support_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_support_services FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON external_support_services FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE family_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON family_contacts FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE family_social_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_social_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON family_social_plans FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE gp_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gp_appointments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON gp_appointments FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE handover_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON handover_documents FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE handover_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON handover_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE handover_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON handover_tasks FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE handover_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_updates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON handover_updates FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE handover_yp_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_yp_summaries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON handover_yp_summaries FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_assets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_assets FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_budget_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_budget_lines FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_budgets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_budgets FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_check_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_check_completions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_check_completions FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_check_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_check_instances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_check_instances FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_check_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_check_issues FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_check_issues FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_check_item_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_check_item_responses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_check_item_responses FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_check_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_check_template_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_check_template_items FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_check_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_check_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_check_templates FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_checks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_checks FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_documents FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_expenses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_expenses FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_logs FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE home_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON home_tasks FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE homes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON homes FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE hr_policy_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_policy_staff_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON hr_policy_staff_assignments FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE ils_plan_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ils_plan_sections FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ils_plan_sections FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE ils_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ils_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ils_plans FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE ils_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ils_session_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ils_session_logs FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE key_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_people FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON key_people FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE kpi_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_options FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kpi_options FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE kpi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON kpi_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE la_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON la_reviews FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leave_balances FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leave_requests FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE location_tracking_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tracking_consents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON location_tracking_consents FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE maintenance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_contracts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON maintenance_contracts FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON maintenance_logs FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON maintenance_schedules FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE maker_checker_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE maker_checker_matrices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON maker_checker_matrices FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE mar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mar_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON mar_entries FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON meal_plans FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE medication_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON medication_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE missing_from_homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE missing_from_homes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON missing_from_homes FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE neet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE neet_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON neet_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notifications FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE ofsted_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ofsted_notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ofsted_notifications FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organisations FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE pa_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_details FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pa_details FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE pa_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_visits FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pa_visits FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE pathway_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pathway_plans FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_periods FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pay_periods FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON payslips FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON petty_cash_transactions FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE petty_cashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cashes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON petty_cashes FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE placement_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_details FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON placement_details FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE placement_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_fees FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON placement_fees FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE placement_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON placement_invoices FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE placement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON placement_plans FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE post_move_on_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_move_on_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON post_move_on_contacts FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON refresh_tokens FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE reg44_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reg44_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON reg44_reports FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE reg45_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reg45_reviews FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON reg45_reviews FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE resident_allowances ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_allowances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON resident_allowances FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE resident_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON resident_documents FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE resident_savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_savings FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON resident_savings FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE resident_savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_savings_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON resident_savings_transactions FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON residents FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE return_to_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_to_work_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON return_to_work_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON risk_assessments FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_definitions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON role_definitions FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON role_permissions FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE rota ENABLE ROW LEVEL SECURITY;
ALTER TABLE rota FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON rota FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE safeguarding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE safeguarding_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON safeguarding_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE shift_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_conflicts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shift_conflicts FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handovers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shift_handovers FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shift_templates FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON shifts FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());
ALTER TABLE significant_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE significant_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON significant_events FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability_overrides FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_availability_overrides FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_availability_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_availability_profiles FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_documents FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_expenses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_expenses FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_movements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_movements FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_performances FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_profiles FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_service_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_service_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_service_assignments FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE staff_weekly_availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_weekly_availabilities FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON staff_weekly_availabilities FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE supervision_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervision_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON supervision_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE support_plan_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_plan_signoffs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON support_plan_signoffs FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE support_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON support_plans FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE sw_performance_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_performance_kpis FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON sw_performance_kpis FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE therapeutic_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapeutic_plans FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON therapeutic_plans FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON timesheets FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE toil_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE toil_balances FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON toil_balances FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON training_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_requirements FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON training_requirements FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacancies FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON vacancies FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE visit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON visit_reports FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON visitor_logs FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE welcome_pack_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE welcome_pack_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON welcome_pack_documents FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE wellbeing_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellbeing_check_ins FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON wellbeing_check_ins FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workflow_events FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE workflow_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workflow_items FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE workflow_routing_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_routing_steps FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workflow_routing_steps FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());

ALTER TABLE yp_views_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE yp_views_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON yp_views_records FOR ALL USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());


-- ============================================================
-- carecore_head: PLATFORM OWNER ROLE
-- Provisions new tenant organisations and can activate/deactivate
-- them, but has NO access whatsoever to any tenant data table
-- (residents, staff, bills, etc.) and cannot edit org name/settings.
--
-- IMPORTANT: use a password DIFFERENT from `carecore`'s. These are
-- two distinct trust levels — a leaked tenant-app credential should
-- never grant platform-owner capability, and vice versa.
-- ============================================================
 
CREATE ROLE carecore_head LOGIN PASSWORD 'CHANGE_ME_DIFFERENT_STRONG_PASSWORD';
 
-- Reset first, so this stays correct even if re-run after future
-- schema changes accidentally grant something broader.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM carecore_head;
 
-- Read: every organisation, so the head can list/monitor all tenants.
GRANT SELECT ON organisations TO carecore_head;
 
-- Create: provisioning new tenant organisations.
GRANT INSERT ON organisations TO carecore_head;
 
-- Update: ONLY activation-related columns. Cannot touch name,
-- settings, contact info, hr_policy, branding, etc.
GRANT UPDATE (organisation_status, is_deleted, deleted_at) ON organisations TO carecore_head;
 
-- organisations already has FORCE ROW LEVEL SECURITY with the
-- tenant_isolation policy above (org_id = current_org_id()), which
-- would otherwise limit carecore_head to a single org too. Add a
-- second permissive policy scoped ONLY to carecore_head so it can
-- see every org. Postgres OR's permissive policies together per
-- role, so `carecore`'s tenant_isolation is completely unaffected.
CREATE POLICY head_full_visibility ON organisations
  FOR ALL
  TO carecore_head
  USING (true)
  WITH CHECK (true);





  --with new DB
  CREATE ROLE carecore LOGIN PASSWORD 'SoftwareLighthouseASDF';
CREATE ROLE carecore_head LOGIN PASSWORD 'SoftwareLighthouseCarecore';  -- different password, per earlier

GRANT USAGE, CREATE ON SCHEMA public TO carecore;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO carecore;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO carecore;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO carecore;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO carecore;

CREATE OR REPLACE FUNCTION current_org_id() RETURNS text AS $$
  SELECT current_setting('app.current_org', true)
$$ LANGUAGE sql STABLE;