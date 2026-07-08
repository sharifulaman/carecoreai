import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import ExternalSupportServiceModal from "./ExternalSupportServiceModal";

export default function ExternalSupportServicesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const { data: services = [] } = useQuery({
    queryKey: ["external-support-services"],
    queryFn: () => base44.entities.ExternalSupportService.filter({ org_id: ORG_ID }, "-added_date", 100),
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ExternalSupportService.delete(id),
    onSuccess: () => {
      toast.success("Service deleted");
      qc.invalidateQueries({ queryKey: ["external-support-services"] });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(s =>
      (s.agency_organisation_name || "").toLowerCase().includes(q) ||
      (s.contact_name || "").toLowerCase().includes(q) ||
      (s.service_type || "").toLowerCase().includes(q)
    );
  }, [services, search]);

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h.name])), [homes]);
  const residentMap = useMemo(() => Object.fromEntries(residents.map(r => [r.id, r.display_name])), [residents]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">External Support Services</h2>
          <p className="text-xs text-slate-500 mt-1">Manage agencies and external providers supporting residents</p>
        </div>
        <Button onClick={() => { setSelectedService(null); setShowModal(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Add Service
        </Button>
      </div>

      {showModal && (
        <ExternalSupportServiceModal
          service={selectedService}
          homes={homes}
          residents={residents}
          onClose={() => { setShowModal(false); setSelectedService(null); }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ["external-support-services"] });
            setShowModal(false);
            setSelectedService(null);
          }}
        />
      )}

      <div className="flex items-center gap-2 mb-4">
        <Search className="w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search agencies, contacts, service types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          <p className="font-medium">No external support services found</p>
          <p className="text-sm mt-1">Add your first service to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Agency / Organisation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Service Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Children</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Hours/Week</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Contract Period</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(service => (
                  <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{service.agency_organisation_name}</p>
                        {service.service_ref && <p className="text-xs text-slate-500">{service.service_ref}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600">
                        {service.contact_name && <p>{service.contact_name}</p>}
                        {service.contact_phone && <p className="text-slate-500">{service.contact_phone}</p>}
                        {service.contact_email && <p className="text-slate-500">{service.contact_email}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 capitalize">{service.service_type?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{service.number_of_children_receiving_service || "—"}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">{service.hours_per_week_provided || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {service.contract_start_date && service.contract_end_date ? (
                        <p>{new Date(service.contract_start_date).toLocaleDateString("en-GB")} to {new Date(service.contract_end_date).toLocaleDateString("en-GB")}</p>
                      ) : (
                        <p>—</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${service.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                        {service.status || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setSelectedService(service); setShowModal(true); }} className="p-1.5 hover:bg-blue-50 rounded transition-colors text-slate-400 hover:text-blue-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { confirmDeleteToast(`"${service.agency_organisation_name || "this service"}"`, () => { deleteMutation.mutate(service.id); }); }} className="p-1.5 hover:bg-red-50 rounded transition-colors text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            Showing {filtered.length} of {services.length} services
          </div>
        </div>
      )}
    </div>
  );
}