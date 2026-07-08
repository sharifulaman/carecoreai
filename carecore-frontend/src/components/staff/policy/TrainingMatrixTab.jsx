import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTrainingData } from "@/components/staff/training/useTrainingData";
import { calcTrainingStatus } from "@/components/staff/training/TrainingStatusBadge";
import TrainingStatusModal from "@/components/staff/hr-dashboard/TrainingStatusModal";
import TrainingStatDetailModal from "./TrainingStatDetailModal";
import TrainingReportModal from "./TrainingReportModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, FileText, Grid3x3, List, RefreshCw, Users, BookOpen,
  Clock, AlertTriangle, X, ChevronDown, Plus, Loader2, Pencil, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { secureGateway } from "@/lib/secureGateway";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_LEGEND = [
  { label: "Completed", className: "bg-green-500" },
  { label: "Due Soon", className: "bg-amber-500" },
  { label: "Overdue", className: "bg-red-500" },
  { label: "Not Started", className: "border-2 border-blue-500 bg-transparent" },
  { label: "Not Applicable", className: "bg-slate-400" },
];

const CELL_COLORS = {
  completed: "bg-green-50 text-green-700 border border-green-200",
  valid: "bg-green-50 text-green-700 border border-green-200",
  expiring_soon: "bg-amber-50 text-amber-700 border border-amber-200",
  expired: "bg-red-50 text-red-700 border border-red-200",
  not_started: "bg-blue-50 text-blue-600 border border-blue-200",
  in_progress: "bg-blue-50 text-blue-600 border border-blue-200",
  na: "bg-slate-50 text-slate-400 border border-slate-200",
};

const CELL_LABELS = {
  completed: "Completed",
  valid: "Valid",
  expiring_soon: "Due Soon",
  expired: "Overdue",
  not_started: "Not Started",
  in_progress: "In Progress",
  na: "N/A",
};

function SummaryCard({ icon: Icon, label, value, color, onClick }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 text-left w-full",
        onClick && "hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
      )}
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium leading-tight">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
      </div>
    </Comp>
  );
}

function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const currentLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 whitespace-nowrap"
      >
        {currentLabel}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs hover:bg-slate-50",
                  opt.value === value ? "bg-blue-50 text-blue-600 font-semibold" : "text-slate-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MatrixCell({ record, onClick }) {
  const status = calcTrainingStatus(record);
  const date = record?.completion_date;
  const dateLabel = status === "completed" || status === "valid"
    ? `Last Completed ${date ? format(new Date(date), "d MMM yyyy") : "—"}`
    : status === "expiring_soon"
      ? `Due Soon ${record?.expiry_date ? format(new Date(record.expiry_date), "d MMM yyyy") : "—"}`
      : status === "expired"
        ? `Overdue ${record?.expiry_date ? format(new Date(record.expiry_date), "d MMM yyyy") : "—"}`
        : status === "in_progress"
          ? "In Progress"
          : "Not Started";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded-md text-[10px] font-medium transition-all hover:opacity-75 cursor-pointer",
        CELL_COLORS[status]
      )}
    >
      <p className="font-semibold leading-tight">{CELL_LABELS[status]}</p>
      <p className="text-[9px] opacity-75 leading-tight mt-0.5">{dateLabel}</p>
    </button>
  );
}

function MatrixView({ staff, courses, recordMap, onCellClick }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left py-3 px-4 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[200px]">
                Training Module
              </th>
              {staff.map(s => (
                <th key={s.id} className="text-center py-2 px-2 min-w-[140px] align-top">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {s.full_name?.charAt(0) || "?"}
                    </div>
                    <p className="font-semibold text-slate-800 text-[11px] leading-tight">{s.full_name}</p>
                    <p className="text-[9px] text-slate-400 leading-tight">{s.role?.replace(/_/g, " ")}</p>
                    <div className="mt-1 space-y-0.5 text-[9px] text-slate-500 leading-tight">
                      <p>Joined: <span className="font-medium text-slate-700">{s.start_date ? format(new Date(s.start_date), "d MMM yyyy") : "—"}</span></p>
                      <p>DBS: <span className="font-medium text-slate-700">{s.dbs_issue_date ? format(new Date(s.dbs_issue_date), "d MMM yyyy") : "—"}</span></p>
                      <p className={cn("font-medium", s.dbs_expiry && new Date(s.dbs_expiry) < new Date() ? "text-red-600" : s.dbs_expiry && new Date(s.dbs_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "text-amber-600" : "text-slate-700")}>
                        Exp: {s.dbs_expiry ? format(new Date(s.dbs_expiry), "d MMM yyyy") : "—"}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courses.map((course, rowIdx) => (
              <tr key={course.id} className={cn("border-b border-slate-100", rowIdx % 2 === 1 && "bg-slate-50/50")}>
                <td className="py-2 px-4 font-medium text-slate-700 sticky left-0 bg-inherit z-10">
                  <p className="text-xs leading-tight">{course.course_name || course.name || "(Unnamed Course)"}</p>
                  {course.is_mandatory && (
                    <span className="text-[9px] text-red-500 font-semibold">Mandatory</span>
                  )}
                </td>
                {staff.map(s => {
                  const record = recordMap[`${s.id}:${course.id}`];
                  return (
                    <td key={s.id} className="py-2 px-1.5 align-top">
                      <MatrixCell
                        record={record}
                        onClick={() => onCellClick(s, course)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {staff.length === 0 && (
        <div className="py-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No staff found matching filters</p>
        </div>
      )}
    </div>
  );
}

function StaffView({ staff, courses, recordMap, onCellClick }) {
  const overallColor = (status) =>
    status === "Compliant" ? "bg-green-100 text-green-700" :
      status === "At Risk" ? "bg-amber-100 text-amber-700" :
        "bg-red-100 text-red-700";

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left py-2.5 px-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10">Staff Member</th>
              <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Home</th>
              <th className="text-left py-2.5 px-3 font-semibold text-slate-600">Role</th>
              <th className="text-left py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">Joining Date</th>
              <th className="text-left py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">DBS Check Date</th>
              <th className="text-left py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap">DBS Expiry</th>
              {courses.map(c => (
                <th key={c.id} className="text-center py-2.5 px-2 font-semibold text-slate-600 min-w-[100px]">
                  <div className="text-[10px] leading-tight">{c.course_name || c.name}</div>
                </th>
              ))}
              <th className="text-center py-2.5 px-3 font-semibold text-slate-600">Overall</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 sticky left-0 bg-white z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                      {s.full_name?.charAt(0) || "?"}
                    </div>
                    <span className="font-medium text-xs">{s.full_name}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-xs text-slate-500">{s.homeName || "—"}</td>
                <td className="py-2 px-3 text-xs text-slate-500">{s.start_date ? format(new Date(s.start_date), "d MMM yyyy") : "—"}</td>
                <td className="py-2 px-3 text-xs text-slate-500">{s.dbs_issue_date ? format(new Date(s.dbs_issue_date), "d MMM yyyy") : "—"}</td>
                <td className={cn(
                  "py-2 px-3 text-xs font-medium",
                  s.dbs_expiry && new Date(s.dbs_expiry) < new Date() ? "text-red-600" :
                    s.dbs_expiry && new Date(s.dbs_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? "text-amber-600" :
                      "text-slate-500"
                )}>{s.dbs_expiry ? format(new Date(s.dbs_expiry), "d MMM yyyy") : "—"}</td>
                <td className="py-2 px-3 text-xs text-slate-500">{s.role?.replace(/_/g, " ")}</td>
                {courses.map(c => {
                  const record = recordMap[`${s.id}:${c.id}`];
                  const status = calcTrainingStatus(record);
                  return (
                    <td key={c.id} className="text-center py-2 px-2">
                      <button
                        onClick={() => onCellClick(s, c)}
                        className={cn(
                          "inline-block text-[10px] font-semibold px-2 py-1 rounded whitespace-nowrap transition-all hover:opacity-75 cursor-pointer",
                          CELL_COLORS[status]
                        )}
                      >
                        {CELL_LABELS[status]}
                      </button>
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-center">
                  <span className={cn("inline-block text-[10px] font-semibold px-2.5 py-1 rounded whitespace-nowrap", overallColor(s.overallStatus))}>
                    {s.overallStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {staff.length === 0 && (
        <div className="py-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No staff found matching filters</p>
        </div>
      )}
    </div>
  );
}

export default function TrainingMatrixTab({ staffProfile }) {
  const queryClient = useQueryClient();
  const [filterHome, setFilterHome] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("matrix");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [statModalType, setStatModalType] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [newCourse, setNewCourse] = useState({
    course_name: "",
    category: "Safeguarding",
    expiry_months: "12",
    is_mandatory: true,
    mandatory: "Mandatory for all",
    notes: ""
  });

  const handleEditCourse = (course) => {
    setEditingCourseId(course.id);
    setNewCourse({
      course_name: course.course_name || "",
      category: course.category || "Safeguarding",
      expiry_months: String(course.expiry_months ?? "12"),
      is_mandatory: course.is_mandatory !== false,
      mandatory: course.mandatory || "Mandatory for all",
      notes: course.notes || ""
    });
    setStatModalType(null); // Close the stat modal so we can see the edit modal
    setShowAddCourseModal(true);
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course requirement? This cannot be undone.")) return;
    try {
      await secureGateway.delete("TrainingRequirement", id);
      queryClient.invalidateQueries({ queryKey: ["training-requirements"] });
      toast.success("Course requirement deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete course requirement");
    }
  };

  const handleSaveCourse = async () => {
    if (!newCourse.course_name.trim()) {
      toast.error("Course name is required");
      return;
    }
    setAddingCourse(true);
    try {
      const payload = {
        ...newCourse,
        expiry_months: newCourse.expiry_months === "" ? 0 : parseInt(newCourse.expiry_months) || 0,
        is_active: true,
        roles: ["admin", "admin_officer", "team_leader", "support_worker"],
        home_types: []
      };
      if (editingCourseId) {
        await secureGateway.update("TrainingRequirement", editingCourseId, payload);
        toast.success("Course requirement updated successfully");
      } else {
        payload.display_order = activeCourses.length + 1;
        await secureGateway.create("TrainingRequirement", payload);
        toast.success("Course requirement added successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["training-requirements"] });
      setShowAddCourseModal(false);
      setEditingCourseId(null);
      setNewCourse({
        course_name: "",
        category: "Safeguarding",
        expiry_months: "12",
        is_mandatory: true,
        mandatory: "Mandatory for all",
        notes: ""
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save course requirement");
    } finally {
      setAddingCourse(false);
    }
  };

  const { filteredStaff, activeCourses, recordMap, homes, stats, isLoading } = useTrainingData({
    filterHome, filterRole, filterStatus: "all", staffProfile, panelFilters: {}
  });

  const homeOptions = useMemo(() => [
    { value: "all", label: "All Homes" },
    ...homes.map(h => ({ value: h.id, label: h.name }))
  ], [homes]);

  const roleOptions = useMemo(() => {
    const roles = [...new Set(filteredStaff.map(s => s.role).filter(Boolean))];
    return [
      { value: "all", label: "All Roles" },
      ...roles.map(r => ({ value: r, label: r.replace(/_/g, " ") }))
    ];
  }, [filteredStaff]);

  const deptOptions = [
    { value: "all", label: "All Departments" },
    { value: "care", label: "Care" },
    { value: "finance", label: "Finance" },
    { value: "admin", label: "Admin" },
    { value: "hr", label: "HR" },
  ];

  const searchedStaff = useMemo(() => {
    if (!searchTerm) return filteredStaff;
    const term = searchTerm.toLowerCase();
    return filteredStaff.filter(s =>
      s.full_name?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term)
    );
  }, [filteredStaff, searchTerm]);

  const deptFiltered = useMemo(() => {
    if (filterDept === "all") return searchedStaff;
    return searchedStaff.filter(s => s.professional_line === filterDept);
  }, [searchedStaff, filterDept]);

  const handleCellClick = (staff, course) => {
    setSelectedStaff(staff);
    setSelectedCourse(course);
    setModalOpen(true);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["training-records"] });
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    queryClient.invalidateQueries({ queryKey: ["training-requirements"] });
    setLastRefresh(new Date());
  };

  const handleClearFilters = () => {
    setFilterHome("all");
    setFilterRole("all");
    setFilterDept("all");
    setSearchTerm("");
  };

  const hasActiveFilters = filterHome !== "all" || filterRole !== "all" || filterDept !== "all" || searchTerm;

  const exportStats = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    deptFiltered.forEach(s => {
      activeCourses.forEach(c => {
        const rec = recordMap[`${s.id}:${c.id}`];
        const st = calcTrainingStatus(rec);
        if (st === "expired") overdue++;
        else if (st === "expiring_soon") dueSoon++;
      });
    });
    return { overdueCount: overdue, expiringSoonCount: dueSoon };
  }, [deptFiltered, activeCourses, recordMap]);

  const dueSoonRows = useMemo(() => {
    const rows = [];
    deptFiltered.forEach(s => {
      activeCourses.forEach(c => {
        const rec = recordMap[`${s.id}:${c.id}`];
        if (calcTrainingStatus(rec) === "expiring_soon") {
          rows.push({ staff: s, course: c, record: rec });
        }
      });
    });
    return rows;
  }, [deptFiltered, activeCourses, recordMap]);

  const overdueRows = useMemo(() => {
    const rows = [];
    deptFiltered.forEach(s => {
      activeCourses.forEach(c => {
        const rec = recordMap[`${s.id}:${c.id}`];
        if (calcTrainingStatus(rec) === "expired") {
          rows.push({ staff: s, course: c, record: rec });
        }
      });
    });
    return rows;
  }, [deptFiltered, activeCourses, recordMap]);

  const STAT_MODALS = {
    staff: {
      title: "Staff in View",
      icon: Users,
      columns: [
        { key: "name", label: "Staff Member", render: r => r.full_name },
        { key: "role", label: "Role", render: r => r.role?.replace(/_/g, " ") },
        { key: "home", label: "Home", render: r => r.homeName || "—" },
        { key: "status", label: "Overall", render: r => r.overallStatus },
      ],
      rows: deptFiltered,
      emptyMessage: "No staff found matching the current filters.",
    },
    courses: {
      title: "Training Modules",
      icon: BookOpen,
      columns: [
        { key: "name", label: "Course", render: r => r.course_name || r.name || "(Unnamed Course)" },
        { key: "mandatory", label: "Mandatory", render: r => r.is_mandatory ? "Yes" : "No" },
        { key: "expiry", label: "Validity (months)", render: r => r.expiry_months || "—" },
        {
          key: "actions",
          label: "Actions",
          render: r => (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => handleEditCourse(r)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDeleteCourse(r.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )
        }
      ],
      rows: activeCourses,
      emptyMessage: "No training modules configured.",
    },
    dueSoon: {
      title: "Trainings Due Soon",
      icon: Clock,
      columns: [
        { key: "staff", label: "Staff", render: r => r.staff.full_name },
        { key: "course", label: "Training", render: r => r.course.course_name || r.course.name },
        { key: "expiry", label: "Expiry Date", render: r => r.record?.expiry_date ? format(new Date(r.record.expiry_date), "d MMM yyyy") : "—" },
      ],
      rows: dueSoonRows,
      emptyMessage: "No trainings due soon.",
    },
    overdue: {
      title: "Overdue Trainings",
      icon: AlertTriangle,
      columns: [
        { key: "staff", label: "Staff", render: r => r.staff.full_name },
        { key: "course", label: "Training", render: r => r.course.course_name || r.course.name },
        { key: "expiry", label: "Expired Since", render: r => r.record?.expiry_date ? format(new Date(r.record.expiry_date), "d MMM yyyy") : "—" },
      ],
      rows: overdueRows,
      emptyMessage: "No overdue trainings.",
    },
  };

  const currentStatModal = statModalType ? STAT_MODALS[statModalType] : null;

  const reportFilters = {
    home: filterHome !== "all" ? homeOptions.find(o => o.value === filterHome)?.label : "All Homes",
    department: filterDept !== "all" ? deptOptions.find(o => o.value === filterDept)?.label : "All Departments",
    role: filterRole !== "all" ? roleOptions.find(o => o.value === filterRole)?.label : "All Roles",
    search: searchTerm || "",
  };

  const reportGeneratedBy = {
    name: staffProfile?.full_name || "System User",
    role: staffProfile?.role?.replace(/_/g, " "),
  };

  const currentRecord = selectedStaff && selectedCourse
    ? recordMap[`${selectedStaff.id}:${selectedCourse.id}`]
    : null;

  return (
    <>
      <TrainingStatusModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["training-records"] });
          }
        }}
        staff={selectedStaff}
        course={selectedCourse}
        currentRecord={currentRecord}
      />

      <TrainingStatDetailModal
        open={!!statModalType}
        onOpenChange={(open) => { if (!open) setStatModalType(null); }}
        title={currentStatModal?.title}
        icon={currentStatModal?.icon}
        columns={currentStatModal?.columns || []}
        rows={currentStatModal?.rows || []}
        emptyMessage={currentStatModal?.emptyMessage}
      />

      <TrainingReportModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        staff={deptFiltered}
        courses={activeCourses}
        recordMap={recordMap}
        stats={exportStats}
        filters={reportFilters}
        generatedBy={reportGeneratedBy}
      />

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Training Matrix</h2>
            <p className="text-sm text-slate-500">View training completion and compliance status across your team.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setReportModalOpen(true)} disabled={isLoading || deptFiltered.length === 0}>
              <FileText className="w-4 h-4" />
              Generate Report
            </Button>
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowAddCourseModal(true)}>
              <Plus className="w-4 h-4" />
              Add Course
            </Button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <FilterDropdown label="All Homes" value={filterHome} options={homeOptions} onChange={setFilterHome} />
          <FilterDropdown label="All Departments" value={filterDept} options={deptOptions} onChange={setFilterDept} />
          <FilterDropdown label="All Roles" value={filterRole} options={roleOptions} onChange={setFilterRole} />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-xs"
            />
          </div>
        </div>

        {/* Active Filter Tags */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {filterHome !== "all" && (
              <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                Home: {homeOptions.find(o => o.value === filterHome)?.label}
                <button onClick={() => setFilterHome("all")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterDept !== "all" && (
              <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                Department: {deptOptions.find(o => o.value === filterDept)?.label}
                <button onClick={() => setFilterDept("all")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filterRole !== "all" && (
              <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                Role: {roleOptions.find(o => o.value === filterRole)?.label}
                <button onClick={() => setFilterRole("all")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchTerm && (
              <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                Search: "{searchTerm}"
                <button onClick={() => setSearchTerm("")}><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={handleClearFilters} className="text-xs text-blue-600 hover:underline font-medium">
              Clear all
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard icon={Users} label="Total Staff in View" value={deptFiltered.length} color="bg-blue-50 text-blue-600" onClick={() => setStatModalType("staff")} />
          <SummaryCard icon={BookOpen} label="Total Trainings" value={activeCourses.length} color="bg-purple-50 text-purple-600" onClick={() => setStatModalType("courses")} />
          <SummaryCard icon={Clock} label="Due Soon" value={exportStats.expiringSoonCount} color="bg-amber-50 text-amber-600" onClick={() => setStatModalType("dueSoon")} />
          <SummaryCard icon={AlertTriangle} label="Overdue" value={exportStats.overdueCount} color="bg-red-50 text-red-600" onClick={() => setStatModalType("overdue")} />
          <button onClick={handleRefresh} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3 hover:bg-slate-50 text-left">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-500">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 font-medium leading-tight">Data as of</p>
              <p className="text-xs font-bold text-slate-700 leading-tight">{format(lastRefresh, "d MMM yyyy, HH:mm")}</p>
            </div>
          </button>
        </div>

        {/* View Toggle + Legend */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("matrix")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                viewMode === "matrix" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Grid3x3 className="w-3.5 h-3.5" />
              Matrix View
            </button>
            <button
              onClick={() => setViewMode("staff")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                viewMode === "staff" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="w-3.5 h-3.5" />
              Staff View
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {STATUS_LEGEND.map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-full", item.className)} />
                <span className="text-[10px] text-slate-500 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading training data...</p>
          </div>
        ) : viewMode === "matrix" ? (
          <MatrixView
            staff={deptFiltered}
            courses={activeCourses}
            recordMap={recordMap}
            onCellClick={handleCellClick}
          />
        ) : (
          <StaffView
            staff={deptFiltered}
            courses={activeCourses}
            recordMap={recordMap}
            onCellClick={handleCellClick}
          />
        )}
      </div>

      <Dialog open={showAddCourseModal} onOpenChange={setShowAddCourseModal}>
        <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingCourseId ? "Edit Training Course Requirement" : "Add Training Course Requirement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Course Name</label>
              <Input
                placeholder="e.g. First Aid Training"
                value={newCourse.course_name}
                onChange={e => setNewCourse(c => ({ ...c, course_name: e.target.value }))}
                className="h-8 text-xs bg-white border border-slate-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Category</label>
                <select
                  value={newCourse.category}
                  onChange={e => setNewCourse(c => ({ ...c, category: e.target.value }))}
                  className="w-full text-xs h-8 border border-slate-200 rounded-md px-2 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Safeguarding">Safeguarding</option>
                  <option value="Health & Safety">Health & Safety</option>
                  <option value="Clinical">Clinical</option>
                  <option value="Behaviour">Behaviour</option>
                  <option value="Legislation">Legislation</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Induction">Induction</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Expiry (Months)</label>
                <Input
                  type="number"
                  placeholder="e.g. 12"
                  value={newCourse.expiry_months}
                  onChange={e => setNewCourse(c => ({ ...c, expiry_months: e.target.value }))}
                  className="h-8 text-xs bg-white border border-slate-200"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center gap-2 h-8">
                  <input
                    type="checkbox"
                    id="is_mandatory_checkbox"
                    checked={newCourse.is_mandatory}
                    onChange={e => setNewCourse(c => ({ ...c, is_mandatory: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-200 bg-white"
                  />
                  <label htmlFor="is_mandatory_checkbox" className="font-semibold text-slate-700 cursor-pointer">Is Mandatory?</label>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Mandatory Rule</label>
                <select
                  value={newCourse.mandatory}
                  onChange={e => setNewCourse(c => ({ ...c, mandatory: e.target.value }))}
                  className="w-full text-xs h-8 border border-slate-200 rounded-md px-2 bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="Mandatory for all">Mandatory for all</option>
                  <option value="Mandatory for SW">Mandatory for SW</option>
                  <option value="Optional">Optional</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Notes / Instructions</label>
              <textarea
                placeholder="Optional notes..."
                value={newCourse.notes}
                onChange={e => setNewCourse(c => ({ ...c, notes: e.target.value }))}
                className="w-full text-xs min-h-[60px] p-2 border border-slate-200 rounded-md bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-8 text-xs border border-slate-200" onClick={() => setShowAddCourseModal(false)} disabled={addingCourse}>
                Cancel
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs" onClick={handleSaveCourse} disabled={addingCourse}>
                {addingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Course"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}