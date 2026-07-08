import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrganisationTab from "./tabs/OrganisationTab";
import ModuleVisibilityTabNew from "./tabs/ModuleVisibilityTabNew";
import HomeTypesTab from "./tabs/HomeTypesTab";
import KPIFormTab from "./tabs/KPIFormTab";
import FinancialRulesTab from "./tabs/FinancialRulesTab";
import PettyCashRulesTab from "./tabs/PettyCashRulesTab";
import InvoiceSettingsTab from "./tabs/InvoiceSettingsTab";
import ResidentAndYPTab from "./tabs/ResidentAndYPTab";
import CareSettingsTab from "./tabs/CareSettingsTab";
import ComplianceThresholdsTab from "./tabs/ComplianceThresholdsTab";
import RotaAndShiftsTab from "./tabs/RotaAndShiftsTab";
import HandoverSettingsTab from "./tabs/HandoverSettingsTab";
import NotificationRulesTabNew from "./tabs/NotificationRulesTabNew";
import DashboardConfigTab from "./tabs/DashboardConfigTab";
import CICTemplateTab from "./tabs/CICTemplateTab";
import AnalyticsSettingsTab from "./tabs/AnalyticsSettingsTab";
import StaffAndHRRulesTab from "./tabs/StaffAndHRRulesTab";
import SecurityAndAccessTab from "./tabs/SecurityAndAccessTab";
import DataAndExportTab from "./tabs/DataAndExportTab";
import AuditLogTabNew from "./tabs/AuditLogTabNew";
import ContractTemplatesTab from "./tabs/ContractTemplatesTab";

export default function AdminControlPanelTabs({ user }) {
  const [activeTab, setActiveTab] = useState("organisation");

  const TAB_LIST = [
    { key: "organisation", label: "Organisation" },
    { key: "modules", label: "Module Visibility" },
    { key: "home-types", label: "Home Types" },
    { key: "kpi-form", label: "KPI Form" },
    { key: "financial", label: "Financial Rules" },
    { key: "petty-cash", label: "Petty Cash Rules" },
    { key: "invoice", label: "Invoice Settings" },
    { key: "resident", label: "Resident and YP" },
    { key: "care", label: "Care Settings" },
    { key: "compliance", label: "Compliance Thresholds" },
    { key: "rota", label: "Rota and Shifts" },
    { key: "handover", label: "Handover Settings" },
    { key: "notifications", label: "Notification Rules" },
    { key: "dashboard", label: "Dashboard Config" },
    { key: "cic", label: "CIC Template" },
    { key: "analytics", label: "Analytics Settings" },
    { key: "staff-hr", label: "Staff and HR Rules" },
    { key: "security", label: "Security and Access" },
    { key: "data-export", label: "Data and Export" },
    { key: "audit", label: "Audit Log" },
    { key: "contracts", label: "Contract Templates" },
  ];

  return (
    <div className="space-y-0">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted rounded-xl flex-wrap h-auto gap-1 p-1 justify-start">
          {TAB_LIST.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="rounded-lg text-xs whitespace-nowrap">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="organisation"><OrganisationTab /></TabsContent>
          <TabsContent value="modules"><ModuleVisibilityTabNew /></TabsContent>
          <TabsContent value="home-types"><HomeTypesTab /></TabsContent>
          <TabsContent value="kpi-form"><KPIFormTab /></TabsContent>
          <TabsContent value="financial"><FinancialRulesTab /></TabsContent>
          <TabsContent value="petty-cash"><PettyCashRulesTab /></TabsContent>
          <TabsContent value="invoice"><InvoiceSettingsTab /></TabsContent>
          <TabsContent value="resident"><ResidentAndYPTab /></TabsContent>
          <TabsContent value="care"><CareSettingsTab /></TabsContent>
          <TabsContent value="compliance"><ComplianceThresholdsTab /></TabsContent>
          <TabsContent value="rota"><RotaAndShiftsTab /></TabsContent>
          <TabsContent value="handover"><HandoverSettingsTab /></TabsContent>
          <TabsContent value="notifications"><NotificationRulesTabNew /></TabsContent>
          <TabsContent value="dashboard"><DashboardConfigTab /></TabsContent>
          <TabsContent value="cic"><CICTemplateTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsSettingsTab /></TabsContent>
          <TabsContent value="staff-hr"><StaffAndHRRulesTab /></TabsContent>
          <TabsContent value="security"><SecurityAndAccessTab /></TabsContent>
          <TabsContent value="data-export"><DataAndExportTab /></TabsContent>
          <TabsContent value="audit"><AuditLogTabNew user={user} /></TabsContent>
          <TabsContent value="contracts"><ContractTemplatesTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}