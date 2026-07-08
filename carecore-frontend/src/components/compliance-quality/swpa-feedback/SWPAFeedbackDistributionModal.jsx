import { useState, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Mail, Send } from "lucide-react";
import { toast } from "sonner";

export default function SWPAFeedbackDistributionModal({ orgId, template, staffList = [], onClose }) {
  const qc = useQueryClient();
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [sendMethod, setSendMethod] = useState("app"); // "app" or "email"
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      return s.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [staffList, searchTerm]);

  const createSubmissionsMutation = useMutation({
    mutationFn: async (data) => {
      // Create SWPAFeedbackSubmission records
      const submissions = data.staffIds.map(staffId => ({
        org_id: orgId,
        template_id: template.id,
        template_name: template.name,
        template_version: template.version_number,
        social_worker_id: staffId,
        social_worker_name: data.staffNames[staffId],
        social_worker_email: data.staffEmails[staffId],
        home_id: data.homeId,
        home_name: data.homeName,
        status: "draft",
        due_date: data.dueDate,
        responses: {}
      }));
      
      return base44.entities.SWPAFeedbackSubmission.bulkCreate(submissions);
    },
    onSuccess: () => {
      toast.success(`Feedback form distributed to ${selectedStaff.length} social worker(s)`);
      qc.invalidateQueries({ queryKey: ["swpa-submissions"] });
      onClose?.();
    },
    onError: (err) => toast.error("Error: " + err.message)
  });

  const handleDistribute = () => {
    if (selectedStaff.length === 0) {
      toast.error("Select at least one social worker");
      return;
    }
    if (!dueDate) {
      toast.error("Please set a due date");
      return;
    }

    const staffNames = {};
    const staffEmails = {};
    selectedStaff.forEach(id => {
      const staff = staffList.find(s => s.id === id);
      if (staff) {
        staffNames[id] = staff.full_name;
        staffEmails[id] = staff.email;
      }
    });

    createSubmissionsMutation.mutate({
      staffIds: selectedStaff,
      staffNames,
      staffEmails,
      dueDate,
      homeId: null,
      homeName: null
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-bold">Distribute Feedback Form</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Template Info */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="font-semibold text-sm">{template.name}</p>
            <p className="text-xs text-muted-foreground mt-1">v{template.version_number}</p>
          </div>

          {/* Send Method */}
          <div>
            <label className="text-sm font-medium block mb-3">Delivery Method</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="app"
                  checked={sendMethod === "app"}
                  onChange={e => setSendMethod(e.target.value)}
                />
                <span className="text-sm">In-App Notification</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="email"
                  checked={sendMethod === "email"}
                  onChange={e => setSendMethod(e.target.value)}
                />
                <span className="text-sm">Email</span>
              </label>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium block mb-2">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          {/* Custom Message */}
          <div>
            <label className="text-sm font-medium block mb-2">Message (Optional)</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a custom message to include with the form..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm h-20"
            />
          </div>

          {/* Select Social Workers */}
          <div>
            <label className="text-sm font-medium block mb-3">Select Social Workers/PAs</label>
            <div className="mb-3">
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="border border-border rounded-lg h-64 overflow-y-auto">
              {filteredStaff.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No social workers/PAs found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStaff.map(staff => (
                    <label key={staff.id} className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStaff.includes(staff.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedStaff([...selectedStaff, staff.id]);
                          } else {
                            setSelectedStaff(selectedStaff.filter(id => id !== staff.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-border"
                      />
                      <div>
                        <p className="text-sm font-medium">{staff.full_name}</p>
                        <p className="text-xs text-muted-foreground">{staff.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedStaff.length} selected
            </p>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/30 sticky bottom-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleDistribute}
            disabled={createSubmissionsMutation.isPending || selectedStaff.length === 0}
            className="gap-2"
          >
            {sendMethod === "email" ? <Mail className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {createSubmissionsMutation.isPending ? "Distributing..." : `Distribute (${selectedStaff.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}