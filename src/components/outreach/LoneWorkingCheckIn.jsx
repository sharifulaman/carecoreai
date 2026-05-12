import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertTriangle, LogOut, LogIn, Clock } from "lucide-react";
import { toast } from "sonner";

const DURATIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

export default function LoneWorkingCheckIn({ staffProfile, home }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState("check-in"); // check-in | checked-in
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [visitAddress, setVisitAddress] = useState("");
  const [duration, setDuration] = useState("60");
  const [activeCheckIn, setActiveCheckIn] = useState(null);

  const { data: residents = [] } = useQuery({
    queryKey: ["outreach-residents", home?.id],
    queryFn: () => secureGateway.filter("Resident", { home_id: home?.id, status: "active" }, "-display_name", 100),
  });

  const { data: currentCheckIn } = useQuery({
    queryKey: ["current-check-in", staffProfile?.id],
    queryFn: () => secureGateway.filter("LoneWorkingLog", { staff_id: staffProfile?.id, status: "checked_in" }),
    refetchInterval: 15000, // Refetch every 15 seconds for timer
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["visit-risk-assessments"],
    queryFn: () => secureGateway.filter("VisitRiskAssessment", { org_id: ORG_ID }, "-assessment_date", 500),
  });

  const selectedResident = residents.find(r => r.id === selectedResidentId);
  const riskAssessment = selectedResident ? riskAssessments.find(a => a.resident_id === selectedResident.id && a.approved_at && !a.is_deleted) : null;

  useEffect(() => {
    if (selectedResident && !visitAddress) {
      setVisitAddress(selectedResident.address || "");
    }
  }, [selectedResident, visitAddress]);

  useEffect(() => {
    if (currentCheckIn && currentCheckIn.length > 0) {
      setMode("checked-in");
      setActiveCheckIn(currentCheckIn[0]);
    } else {
      setMode("check-in");
      setActiveCheckIn(null);
    }
  }, [currentCheckIn]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResident || !visitAddress || !duration) {
        throw new Error("Missing required fields");
      }

      const checkInTime = new Date();
      const checkOutTime = new Date(checkInTime.getTime() + parseInt(duration) * 60000);

      const data = {
        org_id: ORG_ID,
        staff_id: staffProfile.id,
        staff_name: staffProfile.full_name,
        home_id: home.id,
        resident_id: selectedResident.id,
        resident_name: selectedResident.display_name,
        visit_address: visitAddress,
        check_in_datetime: checkInTime.toISOString(),
        expected_duration_minutes: parseInt(duration),
        expected_checkout_datetime: checkOutTime.toISOString(),
        status: "checked_in",
      };

      const result = await secureGateway.create("LoneWorkingLog", data);
      return result;
    },
    onSuccess: () => {
      toast.success(`Checked in for visit with ${selectedResident.display_name}`);
      qc.invalidateQueries({ queryKey: ["current-check-in"] });
      setSelectedResidentId("");
      setVisitAddress("");
      setDuration("60");
    },
    onError: (error) => toast.error("Check-in failed: " + error.message),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeCheckIn) throw new Error("No active check-in");
      
      await secureGateway.update("LoneWorkingLog", activeCheckIn.id, {
        actual_checkout_datetime: new Date().toISOString(),
        status: "completed",
      });
    },
    onSuccess: () => {
      toast.success("Checked out safely");
      qc.invalidateQueries({ queryKey: ["current-check-in"] });
    },
    onError: () => toast.error("Check-out failed"),
  });

  const timeUntilDue = useMemo(() => {
    if (!activeCheckIn) return null;
    const expected = new Date(activeCheckIn.expected_checkout_datetime);
    const now = new Date();
    const diffMs = expected - now;
    if (diffMs <= 0) return "OVERDUE";
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }, [activeCheckIn]);

  // HIGH RISK WARNING
  if (riskAssessment?.overall_risk_level === "high" && mode === "check-in") {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <h3 className="font-bold text-red-800">HIGH RISK VISIT</h3>
            <p className="text-sm text-red-700 mt-1">
              This resident has a high risk visit assessment. Ensure a colleague knows your location and expected return time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // TWO WORKER REQUIRED
  if (riskAssessment?.two_worker_visit_required && mode === "check-in") {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h3 className="font-bold text-amber-800">Two Workers Required</h3>
            <p className="text-sm text-amber-700 mt-1">
              This visit requires a minimum of two workers. Lone working check-in is not available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // CHECK-IN FORM
  if (mode === "check-in") {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-bold text-sm mb-3">Check In for Lone Visit</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Resident</label>
            <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
              <SelectTrigger><SelectValue placeholder="Select resident..." /></SelectTrigger>
              <SelectContent>
                {residents.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Visit Address</label>
            <Input value={visitAddress} onChange={e => setVisitAddress(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Expected Duration</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map(d => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => checkInMutation.mutate()} disabled={!selectedResident || checkInMutation.isPending} className="w-full gap-1">
            <LogIn className="w-4 h-4" /> Check In
          </Button>
        </div>
      </div>
    );
  }

  // CHECKED IN STATE
  if (mode === "checked-in" && activeCheckIn) {
    const isOverdue = timeUntilDue === "OVERDUE";
    return (
      <div className={`rounded-lg p-4 ${isOverdue ? "bg-red-50 border-2 border-red-500" : "bg-green-50 border border-green-200"}`}>
        <div className="space-y-2 mb-3">
          <p className="text-xs text-muted-foreground">Visiting: <span className="font-bold">{activeCheckIn.resident_name}</span></p>
          <p className="text-xs text-muted-foreground">Address: <span className="font-bold">{activeCheckIn.visit_address}</span></p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className={`text-sm font-bold ${isOverdue ? "text-red-600" : "text-green-600"}`}>
              {isOverdue ? "OVERDUE" : `Expected return: ${timeUntilDue}`}
            </p>
          </div>
        </div>
        <Button onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending} className="w-full gap-1" variant={isOverdue ? "destructive" : "default"}>
          <LogOut className="w-4 h-4" /> Check Out
        </Button>
      </div>
    );
  }

  return null;
}