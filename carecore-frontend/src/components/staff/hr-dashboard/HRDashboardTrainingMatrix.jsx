import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import TrainingStatusModal from "./TrainingStatusModal";

const BADGE_COLORS = {
  completed: "bg-green-100 text-green-700 border border-green-300",
  in_progress: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  due_soon: "bg-amber-100 text-amber-800 border border-amber-300",
  overdue: "bg-red-100 text-red-700 border border-red-300",
  not_started: "bg-blue-100 text-blue-700 border border-blue-300",
};

const BADGE_LABELS = {
  completed: "Complete",
  in_progress: "In Progress",
  due_soon: "Due Soon",
  overdue: "Overdue",
  not_started: "Not Started",
};

export default function HRDashboardTrainingMatrix({
  filteredStaff = [],
  activeCourses = [],
  recordMap = {},
  requirements = [],
  staffProfile,
  homes = [],
  onRecordSaved,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showViewAllModal, setShowViewAllModal] = useState(false);

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h.name]));

  const searched = filteredStaff.filter(s =>
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTrainingStatus = (staffId, courseId) => {
    const key = `${staffId}:${courseId}`;
    const record = recordMap[key];
    if (record?.status) {
      return record.status;
    }
    return "not_started";
  };

  const getTrainingRecord = (staffId, courseId) => {
    const key = `${staffId}:${courseId}`;
    return recordMap[key] || null;
  };

  const getOverallStatus = (staff) => {
    const mandatoryCourses = activeCourses.filter(c => c.is_mandatory === true);
    let hasExpired = false;
    let hasAtRisk = false;
    mandatoryCourses.forEach(c => {
      const rec = recordMap[`${staff.id}:${c.id}`];
      const status = getTrainingStatus(staff.id, c.id);
      if (status === "expired" || status === "not_started") hasExpired = true;
      else if (status === "expiring_soon" || status === "in_progress") hasAtRisk = true;
    });
    return hasExpired ? "Non-Compliant" : hasAtRisk ? "At Risk" : "Compliant";
  };

  const handleStatusClick = (staff, course) => {
    setSelectedStaff(staff);
    setSelectedCourse(course);
    setModalOpen(true);
  };

  const ROWS_LIMIT = 5;
  const displayedStaff = searched.slice(0, ROWS_LIMIT);
  const totalStaff = filteredStaff.length;
  const hasMoreStaff = searched.length > ROWS_LIMIT;

  return (
    <>
    <TrainingStatusModal
      open={modalOpen}
      onOpenChange={(open) => {
        setModalOpen(open);
        if (!open) onRecordSaved?.();
      }}
      staff={selectedStaff}
      course={selectedCourse}
      currentRecord={selectedStaff && selectedCourse ? getTrainingRecord(selectedStaff.id, selectedCourse.id) : null}
    />
    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Staff Training Matrix</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export / Report
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search staff..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-8 text-xs"
        />
      </div>

      {/* Table */}
       <div className="overflow-x-auto">
         <table className="w-full text-xs">
           <thead>
             <tr className="border-b border-border bg-muted/30">
               <th className="text-left py-2 px-3 font-semibold text-muted-foreground sticky left-0 bg-muted/30 z-10">Staff Member</th>
               <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Home</th>
               <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Role</th>
               <th className="text-center py-2 px-2 font-semibold text-muted-foreground">Training Modules</th>
               {activeCourses.map(course => (
                 <th
                   key={course.id}
                   className="text-center py-2 px-2 font-semibold text-muted-foreground min-w-max"
                   title={course.course_name || course.name || "(Unnamed Course)"}
                 >
                   <div className="text-xs leading-tight rotate-0">{course.course_name || course.name || "(Unnamed Course)"}</div>
                 </th>
               ))}
               <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Overall Status</th>
             </tr>
           </thead>
           <tbody>
             {displayedStaff.map(staff => {
               const primaryHomeId = staff.home_ids?.[0] || staff.home_id;
               const homeName = homeMap[primaryHomeId] || "No Home Assigned";
               const overallStatus = getOverallStatus(staff);
               return (
                 <tr key={staff.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                   <td className="py-2 px-3 sticky left-0 bg-background z-10">
                     <div className="flex items-center gap-2">
                       <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                         {staff.full_name?.charAt(0) || "?"}
                       </div>
                       <span className="font-medium text-xs">{staff.full_name}</span>
                     </div>
                   </td>
                   <td className="py-2 px-3 text-xs text-muted-foreground">{homeName}</td>
                   <td className="py-2 px-3 text-xs text-muted-foreground">{staff.role?.replace(/_/g, " ")}</td>
                   <td className="py-2 px-2 text-xs text-muted-foreground text-center">
                     <a href="#" className="text-primary hover:underline font-medium">Training Modules</a>
                   </td>
                   {activeCourses.map(course => {
                     const status = getTrainingStatus(staff.id, course.id);
                     return (
                       <td key={course.id} className="text-center py-2 px-2 min-w-max">
                         <button
                           onClick={() => handleStatusClick(staff, course)}
                           className={cn(
                             "inline-block text-xs font-semibold px-2 py-1 rounded whitespace-nowrap transition-all hover:opacity-75 cursor-pointer",
                             BADGE_COLORS[status]
                           )}
                         >
                           {BADGE_LABELS[status]}
                         </button>
                       </td>
                     );
                   })}
                   <td className="py-2 px-3 text-center">
                     <span className={cn(
                       "inline-block text-xs font-semibold px-3 py-1 rounded whitespace-nowrap",
                       overallStatus === "Compliant" ? "bg-green-100 text-green-700" :
                       overallStatus === "At Risk" ? "bg-amber-100 text-amber-700" :
                       "bg-red-100 text-red-700"
                     )}>
                       {overallStatus}
                     </span>
                   </td>
                 </tr>
               );
             })}
           </tbody>
         </table>
       </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {displayedStaff.length} of {totalStaff} staff
        </span>
        {hasMoreStaff && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setShowViewAllModal(true)}
          >
            View All {searched.length} Staff
          </Button>
        )}
      </div>
      </div>

      {/* View All Modal */}
      {showViewAllModal && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-background rounded-xl border border-border max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col m-4">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">All Staff Training Matrix ({searched.length})</h2>
            <button onClick={() => setShowViewAllModal(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground sticky left-0 bg-muted/30 z-10">Staff Member</th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Home</th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Role</th>
                  <th className="text-center py-2 px-2 font-semibold text-muted-foreground">Training Modules</th>
                  {activeCourses.map(course => (
                    <th
                      key={course.id}
                      className="text-center py-2 px-2 font-semibold text-muted-foreground min-w-max"
                      title={course.course_name || course.name}
                    >
                      <div className="text-xs leading-tight rotate-0">{course.course_name || course.name}</div>
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Overall Status</th>
                </tr>
              </thead>
              <tbody>
                {searched.map(staff => {
                  const primaryHomeId = staff.home_ids?.[0] || staff.home_id;
                  const homeName = homeMap[primaryHomeId] || "No Home Assigned";
                  const overallStatus = getOverallStatus(staff);
                  return (
                    <tr key={staff.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 sticky left-0 bg-background z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                            {staff.full_name?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium text-xs">{staff.full_name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{homeName}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{staff.role?.replace(/_/g, " ")}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground text-center">
                        <a href="#" className="text-primary hover:underline font-medium">Training Modules</a>
                      </td>
                      {activeCourses.map(course => {
                        const status = getTrainingStatus(staff.id, course.id);
                        return (
                          <td key={course.id} className="text-center py-2 px-2 min-w-max">
                            <button
                              onClick={() => {
                                setSelectedStaff(staff);
                                setSelectedCourse(course);
                                setModalOpen(true);
                              }}
                              className={cn(
                                "inline-block text-xs font-semibold px-2 py-1 rounded whitespace-nowrap transition-all hover:opacity-75 cursor-pointer",
                                BADGE_COLORS[status]
                              )}
                            >
                              {BADGE_LABELS[status]}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-center">
                        <span className={cn(
                          "inline-block text-xs font-semibold px-3 py-1 rounded whitespace-nowrap",
                          overallStatus === "Compliant" ? "bg-green-100 text-green-700" :
                          overallStatus === "At Risk" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {overallStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
      </>
      );
      }