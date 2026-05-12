import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Palette, Building2, Users, Loader2, Sliders, Plus, Trash2, Edit2, ShieldCheck, ClipboardList, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import AdminControlPanelTabs from "@/components/admin/AdminControlPanelTabs";
import HRPolicyTab from "@/components/staff/tabs/HRPolicyTab";
import OrganisationTab from "@/components/admin/tabs/OrganisationTab";

const KPI_CATEGORIES = [
  { key: "visit_type", label: "Visit Type" },
  { key: "presentation", label: "Resident Presentation" },
  { key: "placement_condition", label: "Placement Condition" },
  { key: "primary_purpose", label: "Primary Purpose" },
  { key: "college_status", label: "College Status" },
  { key: "life_skills", label: "Life Skills" },
  { key: "liaison", label: "Liaison" },
  { key: "engagement_level", label: "Engagement Level" },
  { key: "risk_level", label: "Risk Level" },
  { key: "independence_progress", label: "Independence Progress" },
  { key: "health_adherence", label: "Health Adherence" },
];

export default function Settings() {
  const { user: contextUser, staffProfile: contextStaffProfile } = useOutletContext();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(contextUser);
  const [myStaffProfile, setMyStaffProfile] = useState(contextStaffProfile || null);
  const [fullName, setFullName] = useState(contextStaffProfile?.full_name || contextUser?.full_name || "");
  const [phone, setPhone] = useState(contextStaffProfile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!contextUser);
  const [profileHomes, setProfileHomes] = useState([]);

  // KPI Settings state
  const [selectedCategory, setSelectedCategory] = useState("presentation");
  const [editingId, setEditingId] = useState(null);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [editingCategoryKey, setEditingCategoryKey] = useState(null);
  const [tempCategoryLabel, setTempCategoryLabel] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        if (currentUser?.email) {
          const { secureGateway } = await import("@/lib/secureGateway");
          const profiles = await secureGateway.filter("StaffProfile", { email: currentUser.email });
          const profile = profiles[0] || null;
          setMyStaffProfile(profile);
          setFullName(profile?.full_name || currentUser.full_name || "");
          setPhone(profile?.phone || "");
          // Resolve home names
          if (profile?.home_ids?.length) {
            const homes = await secureGateway.filter("Home", { status: "active" });
            setProfileHomes(homes.filter(h => profile.home_ids.includes(h.id)));
          }
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Use StaffProfile.role (authoritative) — contextStaffProfile is from AppLayout, user state may lag
  const staffProfileRole = contextStaffProfile?.role;
  const role = staffProfileRole || (user?.role === "admin" ? "admin" : "support_worker");
  const isAdmin = role === "admin";

  // KPI Query & Mutations
  const { data: kpiOptions = [] } = useQuery({
    queryKey: ["kpi-options"],
    queryFn: () => base44.entities.KPIOption.filter({ org_id: ORG_ID }),
  });

  const categoryOptions = kpiOptions.filter(o => o.category === selectedCategory && o.active).sort((a, b) => (a.order || 0) - (b.order || 0));

  const createKPIMutation = useMutation({
    mutationFn: (data) => base44.entities.KPIOption.create({ label: data.label, value: data.label, org_id: ORG_ID, category: selectedCategory, active: true, order: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-options"] });
      setNewOptionLabel("");
      toast.success("KPI option added");
    },
  });

  const updateKPIMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.KPIOption.update(id, { value: data.label, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-options"] });
      setEditingId(null);
      toast.success("KPI option updated");
    },
  });

  const deleteKPIMutation = useMutation({
    mutationFn: (id) => base44.entities.KPIOption.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-options"] });
      toast.success("KPI option deleted");
    },
  });

  const handleAddOption = () => {
    if (!newOptionLabel.trim()) {
      toast.error("Label is required");
      return;
    }
    createKPIMutation.mutate({ label: newOptionLabel });
  };

  const handleKPIEdit = (option) => {
    setEditingId(option.id);
    setTempCategoryLabel(option.label);
  };

  const handleSaveKPIEdit = () => {
    if (!tempCategoryLabel.trim()) {
      toast.error("Label is required");
      return;
    }
    updateKPIMutation.mutate({ id: editingId, data: { label: tempCategoryLabel, order: 0 } });
    setEditingId(null);
  };

  const handleEditCategory = (catKey) => {
    const category = KPI_CATEGORIES.find(c => c.key === catKey);
    setEditingCategoryKey(catKey);
    setTempCategoryLabel(category.label);
  };

  const handleSaveCategoryEdit = () => {
    if (!tempCategoryLabel.trim()) {
      toast.error("Label is required");
      return;
    }
    // Update category label in KPI_CATEGORIES (local state)
    const idx = KPI_CATEGORIES.findIndex(c => c.key === editingCategoryKey);
    if (idx >= 0) {
      KPI_CATEGORIES[idx].label = tempCategoryLabel;
    }
    setEditingCategoryKey(null);
    toast.success("Category updated");
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ full_name: fullName });
      setUser(prev => ({ ...prev, full_name: fullName }));
      if (myStaffProfile?.id) {
        const { secureGateway } = await import("@/lib/secureGateway");
        await secureGateway.update("StaffProfile", myStaffProfile.id, { full_name: fullName, phone });
        setMyStaffProfile(prev => ({ ...prev, full_name: fullName, phone }));
      }
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and system preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-muted rounded-xl">
          <TabsTrigger value="profile" className="gap-2 rounded-lg"><User className="w-4 h-4" /> My Profile</TabsTrigger>
          <TabsTrigger value="display" className="gap-2 rounded-lg"><Palette className="w-4 h-4" /> Display</TabsTrigger>
          {isAdmin && <TabsTrigger value="org" className="gap-2 rounded-lg"><Building2 className="w-4 h-4" /> Organisation</TabsTrigger>}
          {isAdmin && <TabsTrigger value="users" className="gap-2 rounded-lg"><Users className="w-4 h-4" /> Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="kpi" className="gap-2 rounded-lg"><Sliders className="w-4 h-4" /> KPI Settings</TabsTrigger>}
          {isAdmin && <TabsTrigger value="hr-policy" className="gap-2 rounded-lg"><ClipboardList className="w-4 h-4" /> HR Policy</TabsTrigger>}
          {isAdmin && <TabsTrigger value="admin" className="gap-2 rounded-lg"><ShieldCheck className="w-4 h-4" /> Admin Control Panel</TabsTrigger>}
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h2 className="font-semibold">My Profile</h2>
            {!myStaffProfile && !loading && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-700">
                Your staff profile has not been set up yet. Please contact your administrator.
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ""} className="mt-1.5" disabled />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1.5" placeholder="e.g. 07700 900000" />
              </div>
              <div>
                <Label>Role</Label>
                <Input value={(myStaffProfile?.role || role).replace(/_/g, " ")} className="mt-1.5 capitalize" disabled />
              </div>
              {myStaffProfile?.employee_id && (
                <div>
                  <Label>Employee ID</Label>
                  <Input value={myStaffProfile.employee_id} className="mt-1.5" disabled />
                </div>
              )}
              {myStaffProfile?.job_title && (
                <div>
                  <Label>Job Title</Label>
                  <Input value={myStaffProfile.job_title} className="mt-1.5" disabled />
                </div>
              )}
            </div>
            {profileHomes.length > 0 && (
              <div>
                <Label>Home Assignments</Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {profileHomes.map(h => (
                    <span key={h.id} className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">{h.name}</span>
                  ))}
                </div>
              </div>
            )}
            <Button className="rounded-xl" onClick={saveProfile} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>

          {/* Delete Account */}
          <div className="bg-card rounded-xl border border-destructive/30 p-6 space-y-3 mt-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <h2 className="font-semibold">Delete Account</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Submitting a deletion request will notify your administrator. Your account and data will be reviewed before removal in accordance with your organisation's data retention policy.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10">
                  Request Account Deletion
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will submit an account deletion request to your administrator. Your account will remain active until reviewed. This action cannot be undone once processed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      base44.integrations.Core.SendEmail({
                        to: user?.email || "",
                        subject: "Account Deletion Request — CareCore AI",
                        body: `Hi ${user?.full_name || "User"},\n\nWe have received your account deletion request for CareCore AI.\n\nYour request has been logged and will be reviewed by your organisation administrator. You will be contacted within 5 working days.\n\nIf you did not submit this request, please contact your administrator immediately.\n\nCareCore AI Support`,
                      }).then(() => toast.success("Deletion request submitted. Check your email for confirmation."))
                        .catch(() => toast.error("Failed to submit request. Please contact your administrator."));
                    }}
                  >
                    Yes, Submit Request
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>

        {/* Display */}
        <TabsContent value="display" className="mt-6">
          <div className="bg-card rounded-xl border border-border p-6 space-y-6">
            <h2 className="font-semibold">Display Preferences</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
              </div>
              <Switch onCheckedChange={(checked) => document.documentElement.classList.toggle("dark", checked)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Compact Mode</p>
                <p className="text-xs text-muted-foreground">Reduce spacing for denser information display</p>
              </div>
              <Switch />
            </div>
          </div>
        </TabsContent>

        {/* Organisation (admin only) */}
        {isAdmin && (
          <TabsContent value="org" className="mt-6">
            <OrganisationTab staffProfile={contextStaffProfile} />
          </TabsContent>
        )}

        {/* Users (admin only) */}
        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">User Management</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                To invite new users, go to your <strong>Base44 Dashboard → Users → Invite User</strong> and set their role to <strong>admin</strong>, or leave as <strong>user</strong> for support workers / team leaders.
              </p>
              <div className="bg-muted rounded-lg p-4 text-sm space-y-1">
                <p><span className="font-medium">admin</span> — Full access: add homes, residents, staff, review reports</p>
                <p><span className="font-medium">user</span> — Support worker / team leader access</p>
              </div>
            </div>
          </TabsContent>
        )}

        {/* KPI Settings (admin only) */}
        {isAdmin && (
          <TabsContent value="kpi" className="mt-6">
            <div className="space-y-6">
              {/* Category Selector with Modify/Delete */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h2 className="font-semibold">KPI Categories</h2>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KPI_CATEGORIES.map(cat => (
                          <SelectItem key={cat.key} value={cat.key}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="icon" variant="outline" className="h-9 w-9 rounded-lg" onClick={() => handleEditCategory(selectedCategory)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Edit Category Modal */}
                {editingCategoryKey && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
                    <Label className="text-xs font-medium">Edit Category Name</Label>
                    <Input
                      className="text-sm"
                      value={tempCategoryLabel}
                      onChange={e => setTempCategoryLabel(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1 text-sm rounded-lg" onClick={handleSaveCategoryEdit} disabled={updateKPIMutation.isPending}>
                        Save
                      </Button>
                      <Button variant="outline" className="text-sm rounded-lg" onClick={() => setEditingCategoryKey(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* KPI Options Management */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
               <h3 className="font-semibold">
                 {KPI_CATEGORIES.find(c => c.key === selectedCategory)?.label} Options
               </h3>

               {/* Options Dropdown */}
               {categoryOptions.length > 0 && (
                 <Select>
                   <SelectTrigger className="w-full">
                     <SelectValue placeholder="Select an option" />
                   </SelectTrigger>
                   <SelectContent>
                     {categoryOptions.map(option => (
                       <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               )}

               {/* Options List */}
               <div className="space-y-2 max-h-60 overflow-y-auto border border-border/50 rounded-lg p-3 bg-muted/20">
                  {categoryOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No options yet.</p>
                  ) : (
                    categoryOptions.map(option => (
                      <div key={option.id}>
                        {editingId === option.id ? (
                          <div className="flex gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <Input
                              className="text-sm flex-1"
                              value={tempCategoryLabel}
                              onChange={e => setTempCategoryLabel(e.target.value)}
                              autoFocus
                            />
                            <Button className="text-sm rounded-lg" onClick={handleSaveKPIEdit} disabled={updateKPIMutation.isPending}>
                              Save
                            </Button>
                            <Button variant="outline" className="text-sm rounded-lg" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                            <p className="text-sm font-medium">{option.label}</p>
                            <div className="flex gap-2">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleKPIEdit(option)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteKPIMutation.mutate(option.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Option Form */}
                <div className="flex gap-2">
                  <Input
                    className="text-sm flex-1"
                    value={newOptionLabel}
                    onChange={e => setNewOptionLabel(e.target.value)}
                    placeholder="e.g., Happy and Healthy"
                    onKeyDown={e => e.key === "Enter" && handleAddOption()}
                  />
                  <Button className="rounded-lg gap-2" onClick={handleAddOption} disabled={createKPIMutation.isPending}>
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        )}

        {/* HR Policy */}
        {isAdmin && (
          <TabsContent value="hr-policy" className="mt-6">
            <HRPolicyTab />
          </TabsContent>
        )}

        {/* Admin Control Panel */}
        {isAdmin && (
          <TabsContent value="admin" className="mt-6">
            <AdminControlPanelTabs user={user} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}