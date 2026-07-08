import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import ExternalSupportServiceModal from "@/components/admin/ExternalSupportServiceModal";
import { useModuleActions } from "@/lib/PermissionContext";

export default function ExternalSupportTab({ residentId, residentName, isAdminOrTL }) {
  const { canEdit } = useModuleActions("residents", { canEdit: isAdminOrTL });
  const [showModal, setShowModal] = useState(false);

  const { data: allServices = [] } = useQuery({
    queryKey: ["external-support-services"],
    queryFn: () => base44.entities.ExternalSupportService.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  // Filter services linked to this resident
  const linkedServices = useMemo(
    () => allServices.filter(s => s.linked_resident_ids?.includes(residentId)),
    [allServices, residentId]
  );

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h.name])), [homes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">External Support Services</h3>
          <p className="text-xs text-slate-500 mt-0.5">Agencies and external providers supporting {residentName}</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowModal(true)} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Link Service
          </Button>
        )}
      </div>

      {showModal && (
        <ExternalSupportServiceModal
          service={null}
          homes={homes}
          residents={residents}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            toast.info("Service linked. Update the service record to confirm all details.");
          }}
        />
      )}

      {linkedServices.length === 0 ? (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600">No external support services linked</p>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowModal(true)} className="mt-3 gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Service
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {linkedServices.map(service => (
            <div key={service.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-slate-900">{service.agency_organisation_name}</h4>
                  <p className="text-xs text-slate-500 capitalize">{service.service_type?.replace(/_/g, " ")}</p>
                </div>
                <a href="/house-management" onClick={(e) => { e.preventDefault(); toast.info("View full service details in Admin Management → External Support Services"); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                {service.contact_name && (
                  <div>
                    <span className="text-slate-500">Contact:</span>
                    <p className="font-medium text-slate-700">{service.contact_name}</p>
                  </div>
                )}
                {service.contact_phone && (
                  <div>
                    <span className="text-slate-500">Phone:</span>
                    <p className="font-medium text-slate-700">{service.contact_phone}</p>
                  </div>
                )}
                {service.hours_per_week_provided && (
                  <div>
                    <span className="text-slate-500">Hours per week:</span>
                    <p className="font-medium text-slate-700">{service.hours_per_week_provided}</p>
                  </div>
                )}
                {service.contract_start_date && (
                  <div>
                    <span className="text-slate-500">Contract:</span>
                    <p className="font-medium text-slate-700">{new Date(service.contract_start_date).toLocaleDateString("en-GB")} to {new Date(service.contract_end_date).toLocaleDateString("en-GB")}</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 mb-2">{service.service_description}</p>

              {(service.linked_home_ids?.length || 0) > 0 && (
                <div className="text-xs text-slate-500">
                  <span className="font-medium">Homes:</span> {service.linked_home_ids?.map(hid => homeMap[hid]).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}