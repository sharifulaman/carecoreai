# CareCore Platform — State Management & Component Architecture

**Version:** 1.0  
**Last Updated:** May 2, 2026  
**Audience:** Frontend developers, React architects

---

## Table of Contents

1. [React Query Architecture](#1-react-query-architecture)
2. [Cache Key Structure](#2-cache-key-structure)
3. [Component Hierarchy](#3-component-hierarchy)
4. [Shared Components](#4-shared-components)
5. [SessionStorage Hint System](#5-sessionstorage-hint-system)
6. [SecureGateway Implementation](#6-securegateway-implementation)
7. [State Lifting & Context](#7-state-lifting--context)

---

## 1. React Query Architecture

### 1.1 TanStack Query Setup

**Initialization (lib/query-client.js):**
```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,           // 5 minutes
      gcTime: 10 * 60 * 1000,             // 10 minutes (formerly cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
```

**Provider Wrapper (App.jsx):**
```jsx
import { QueryClientProvider } from '@tanstack/react-query';

<QueryClientProvider client={queryClientInstance}>
  <Router>
    <AuthenticatedApp />
  </Router>
</QueryClientProvider>
```

### 1.2 Query Hook Pattern

**Basic Usage:**
```javascript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['residents', 'active'],
  queryFn: () => secureGateway.filter('Resident', { status: 'active' }),
  staleTime: 5 * 60 * 1000,  // Override default
  enabled: !!userId,         // Conditional query
});
```

**Query Lifecycle:**
```
1. Query created with key + fn
2. Initial fetch (isLoading=true)
3. Data cached (isLoading=false, data loaded)
4. After 5 min: data marked stale
5. On component focus or refetch: re-fetch
6. After 10 min inactive: garbage collected
```

### 1.3 Mutation Pattern

**Basic Usage:**
```javascript
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: (newData) => secureGateway.create('Resident', newData),
  onSuccess: (data) => {
    // Invalidate related caches
    queryClient.invalidateQueries({ 
      queryKey: ['residents'] 
    });
    // Or update cache directly
    queryClient.setQueryData(['residents', data.id], data);
  },
  onError: (error) => {
    console.error('Failed:', error);
  },
});

const handleCreate = async (formData) => {
  const result = await mutation.mutateAsync(formData);
  return result;
};
```

---

## 2. Cache Key Structure

### 2.1 Naming Convention

**Pattern:** `[entityType, ...filters, ...sorts]`

**Format Rules:**
```
✓ Flat arrays preferred: ['Resident', 'active', '-created_date']
✗ Nested objects discouraged: ['Resident', { status: 'active' }]

Reason: Easier cache invalidation and debugging
```

### 2.2 Core Entity Cache Keys

**List Queries:**
```javascript
// All residents
['residents']

// Filtered residents
['residents', 'active']
['residents', 'high-risk']
['residents', 'home-uuid-123']

// With sort
['residents', 'active', '-created_date']
['residents', 'home-uuid', '-risk_level']

// With pagination
['residents', 'page-1', 'limit-50']
['residents', 'active', 'page-2']
```

**Single Entity:**
```javascript
// Get resident by ID
['residents', 'id-resident-uuid-123']
['Resident', 'resident-uuid-123']  // Alternative (matches entity name)

// Nested relation
['residents', 'resident-uuid', 'risk-assessments']
['residents', 'resident-uuid', 'support-plans', 'active']
```

**Referential Queries:**
```javascript
['homes']
['homes', 'active']
['homes', 'home-uuid-123']

['staff']
['staff', 'dbs-current']
['staff', 'training-overdue']

['appointments']
['appointments', 'resident-uuid', 'upcoming']
['appointments', 'date-2026-05-02']
```

### 2.3 Business Logic Cache Keys

```javascript
// Compliance & Scoring
['compliance', 'ofsted-score']
['compliance', 'home-uuid-123', 'readiness']

// Risk & Safeguarding
['risk-assessments', 'resident-uuid']
['missing-from-home', 'active']

// Finance
['invoices', 'pending']
['timesheets', 'pending-approval']
['payroll', 'period-uuid', 'status']

// Analytics & Dashboards
['dashboard', 'admin', 'overview']
['dashboard', 'team-leader', 'home-uuid']
['analytics', 'resident-metrics', 'date-range']
```

### 2.4 Cache Invalidation Patterns

**Full Invalidation (Delete all):**
```javascript
// After creating new resident
queryClient.invalidateQueries({ queryKey: ['residents'] });
// Clears: ['residents'], ['residents', 'active'], ['residents', 'home-x'], etc.
```

**Partial Invalidation (Specific filters):**
```javascript
// After updating resident's home
queryClient.invalidateQueries({ 
  queryKey: ['residents', 'home-uuid-old'] 
});
queryClient.invalidateQueries({ 
  queryKey: ['residents', 'home-uuid-new'] 
});
```

**Selective by Predicate:**
```javascript
// Invalidate all resident-related queries
queryClient.invalidateQueries({ 
  queryKey: ['residents'],
  type: 'all'  // includes parent + children
});

// Only exact match
queryClient.invalidateQueries({ 
  queryKey: ['residents', 'active'],
  type: 'exact'
});
```

**Optimistic Updates:**
```javascript
const mutation = useMutation({
  mutationFn: (data) => updateResident(data.id, data),
  onMutate: async (newData) => {
    // Rollback helper
    await queryClient.cancelQueries({ 
      queryKey: ['residents', newData.id] 
    });
    
    // Save old data
    const previousData = queryClient.getQueryData(
      ['residents', newData.id]
    );
    
    // Update cache immediately (optimistic)
    queryClient.setQueryData(['residents', newData.id], newData);
    
    return { previousData };
  },
  onError: (err, newData, rollback) => {
    // Restore on error
    queryClient.setQueryData(
      ['residents', newData.id], 
      rollback.previousData
    );
  },
  onSuccess: (data) => {
    queryClient.setQueryData(['residents', data.id], data);
  },
});
```

---

## 3. Component Hierarchy

### 3.1 Global Layout Structure

```
App (Router)
├── ProtectedRoute (Auth wrapper)
│   └── AppLayout (Main shell)
│       ├── AppSidebar (Navigation)
│       ├── TopBar (Header + user menu)
│       └── Outlet (Page content)
│           ├── /residents (Residents page)
│           ├── /staff (Staff page)
│           ├── /24hours (Shift management)
│           ├── /finance (Financial management)
│           └── [10+ other pages]
│
└── Landing (Public landing page)
```

### 3.2 Residents Page Component Tree

```
/residents (Residents.jsx)
├── ResidentFilters (Filter controls)
├── ResidentTabs (Primary nav: Overview, YP, Plans, Risk, etc.)
│
├── TAB: Overview
│   └── YPOverviewDashboard
│       ├── StatCard (summary metrics)
│       ├── ResidentListModal (drill-down)
│       └── ComplianceIndicators
│
├── TAB: Young People (Card view)
│   └── YPCardView
│       ├── YPCard (individual resident)
│       │   └── YPCardExpanded (modal detail)
│       │       ├── AppointmentsTab
│       │       ├── HealthTab
│       │       ├── EducationTab
│       │       ├── RiskTab
│       │       └── [10+ detail tabs]
│       └── ResidentMobileCard (responsive variant)
│
├── TAB: Care Planning (Sub-tabs)
│   ├── Support Plans
│   │   └── SupportPlansTab
│   │       ├── SupportPlanSection (12 sections)
│   │       └── SupportPlanSignoff (modal)
│   ├── Placement Plan
│   │   └── PlacementPlanTab
│   └── Pathway Plan
│       └── PathwayPlanTab
│
├── TAB: Safety & Safeguarding (Sub-tabs)
│   ├── Risk Assessment
│   │   └── RiskTab
│   │       ├── RiskAssessmentPanel
│   │       └── ExploitationRiskTab
│   ├── Behaviour Management
│   │   └── BehaviourManagementForm
│   └── Missing From Home
│       └── MissingTab
│
└── MODALS
    ├── CurrentStatusModal
    ├── NightStayModal
    ├── EducationAttendanceModal
    ├── MealIntakeModal
    └── ILSPlanModal
```

### 3.3 Staff Page Component Tree

```
/staff (Staff.jsx)
├── StaffFilters
├── StaffTabs (Dashboard, Profiles, Training, Supervision, etc.)
│
├── TAB: Dashboard
│   └── HRDashboardTab
│       ├── ComplianceMatrix
│       ├── StatCard (metrics)
│       └── TrainingCharts
│
├── TAB: Profiles
│   └── StaffProfilesList
│       ├── StaffProfileCard
│       └── StaffProfileModal
│           ├── BasicInfoSection
│           ├── ComplianceSection
│           ├── LeaveBalanceSection
│           └── DocumentsSection
│
├── TAB: Training
│   └── TrainingMatrix
│       ├── TrainingStatusBadge
│       └── TrainingRecordModal
│
├── TAB: Supervision
│   └── SupervisionTab
│       └── SupervisionRecordForm
│
├── TAB: Leave
│   └── LeaveManagementTab
│       ├── LeaveCalendar
│       └── LeaveRequestForm
│
└── TAB: Payroll
    └── PayrollTab
        ├── PayslipDocument
        └── PayslipModal
```

### 3.4 Finance Page Component Tree

```
/finance (Finance.jsx)
├── FinanceTabs (Overview, Invoices, Bills, Budgets, etc.)
│
├── TAB: Overview
│   └── FinanceOverviewTab
│       ├── StatCard (revenue, expenses)
│       ├── IncomeGraph
│       └── BudgetBar
│
├── TAB: Invoices
│   └── InvoicingTab
│       ├── InvoiceTable
│       ├── InvoiceGeneratorForm
│       └── InvoiceDetailPanel
│
├── TAB: Bills
│   └── BillsExpensesTab
│       ├── BillList
│       └── BillForm / BillDetailsModal
│
├── TAB: Budgets
│   └── BudgetsTab
│       └── BudgetBar
│
└── TAB: Petty Cash
    └── PettyCashTabMain
        ├── PettyCashBalance
        └── PettyCashTransactionForm
```

---

## 4. Shared Components

### 4.1 Shared UI Components (components/ui/)

**Form & Input:**
```
- Button (variants: primary, ghost, outline, secondary, destructive)
- Input (text, email, number, password)
- Select (dropdown with search)
- Checkbox (single or list)
- Radio (mutually exclusive)
- Toggle (on/off switch)
- Label (form field label)
- Textarea (multi-line text)
```

**Feedback & Status:**
```
- Badge (status indicator)
- Alert (inline messaging)
- Toast (temporary notification)
- Spinner (loading indicator)
- ProgressBar (progress visual)
```

**Layout & Structure:**
```
- Card (content container)
- Accordion (collapsible sections)
- Tabs (tabbed navigation)
- Modal / Dialog (overlay)
- Drawer / Sheet (side panel)
- Table (tabular data)
- Pagination (navigation)
```

**Navigation:**
```
- Sidebar (main nav)
- Breadcrumb (path)
- Dropdown Menu (action menu)
- Navigation Menu (main nav)
```

### 4.2 Business Components (Shared Across Modules)

**Resident Components:**
```
- ResidentCard (individual resident summary)
- ResidentMobileCard (mobile variant)
- RiskBadge (risk level visual)
- StatusBadge (active/archived/moved-on)
- ResidentListModal (searchable resident picker)
```

**Staff Components:**
```
- StaffProfileCard (staff detail summary)
- ComplianceMatrix (training/DBS status table)
- LeaveBalanceCard (annual leave visual)
- TrainingStatusBadge (current/overdue/due-soon)
```

**Financial Components:**
```
- BudgetBar (budget vs actuals visual)
- InvoiceTable (invoice list with status)
- PayslipDocument (formatted payslip)
```

**Risk & Safeguarding:**
```
- RiskAssessmentPanel (category ratings)
- MissingAlertBanner (active MFH alert)
- SafeguardingFlag (safeguarding concern marker)
```

### 4.3 Modal & Form Components (Reused)

**Common Modals:**
```
- ConfirmationModal (delete/destructive action)
- FormModal (data entry form)
- DetailModal (view-only detail)
- DatePickerModal (date selection)
```

**Common Forms:**
```
- JsonSchemaForm (auto-generated from entity schema)
- DynamicFieldArray (add/remove fields)
- FileUploadField (file selection)
- RichTextEditor (text + formatting)
```

---

## 5. SessionStorage Hint System

### 5.1 Purpose

Store UI hints & guidance that guide users through workflows without being intrusive.

**Use Cases:**
- "First time creating a visit report?" → Show 30-second walkthrough
- "Support plan incomplete" → Highlight missing sections
- "New feature: Risk assessment scoring" → Info badge on first use

### 5.2 Implementation

**Structure (sessionStorage):**
```javascript
// Key format: `hint_<feature_name>_<version>`

sessionStorage.setItem(
  'hint_support_plan_signoff_v1',
  JSON.stringify({
    shown: true,
    timestamp: Date.now(),
    action: 'dismissed' // or 'completed'
  })
);

// Retrieve
const hint = JSON.parse(
  sessionStorage.getItem('hint_support_plan_signoff_v1') || '{}'
);
```

**Custom Hook:**
```javascript
// hooks/useHint.js
export function useHint(hintKey) {
  const [shown, setShown] = useState(() => {
    const stored = sessionStorage.getItem(`hint_${hintKey}`);
    return stored ? false : true;  // Show if never dismissed
  });

  const dismiss = () => {
    sessionStorage.setItem(
      `hint_${hintKey}`,
      JSON.stringify({ shown: true, timestamp: Date.now() })
    );
    setShown(false);
  };

  return { shown, dismiss };
}
```

**Usage in Component:**
```javascript
function SupportPlanTab() {
  const { shown: showSignoffHint, dismiss: dismissHint } = 
    useHint('support_plan_signoff_v1');

  return (
    <div>
      {showSignoffHint && (
        <InfoBanner
          title="Ready to sign off?"
          message="Complete all 12 sections first. You'll be locked out of signoff until ready."
          onDismiss={dismissHint}
        />
      )}
      {/* Rest of component */}
    </div>
  );
}
```

### 5.3 Lifecycle

```
Session Start
├── Check sessionStorage for hints
├── If not found: Show hint = true
├── User dismisses/completes hint
├── Set sessionStorage: { shown: true, timestamp, action }
└── Hint hidden for rest of session

On Page Reload
├── sessionStorage persists (within same tab/session)
├── Hint remains hidden
└── New session (new tab) = fresh hints
```

**Note:** SessionStorage clears when user closes tab or browser. Perfect for per-session guidance.

---

## 6. SecureGateway Implementation

### 6.1 Purpose

Thin wrapper around Base44 entities SDK that:
- Applies org_id filter automatically
- Enforces role-based filtering
- Handles error logging
- Provides consistent query interface

### 6.2 Implementation (lib/secureGateway.js)

```javascript
import { base44 } from '@/api/base44Client';

class SecureGateway {
  constructor() {
    this.user = null;
  }

  setUser(user) {
    this.user = user;
  }

  async filter(entityName, query = {}, sort = '-created_date', limit = 100) {
    if (!this.user) throw new Error('User not authenticated');

    // Apply org_id filter
    const secureQuery = {
      org_id: this.user.org_id,
      ...query,
    };

    // Apply role-based home filtering (team leaders only)
    if (this.user.role === 'team_leader' && this.user.home_ids_assigned) {
      secureQuery.home_id = { $in: this.user.home_ids_assigned };
    }

    // Apply support worker filtering (key work residents only)
    if (this.user.role === 'support_worker' && this.user.key_work_resident_ids) {
      if (entityName === 'Resident') {
        secureQuery.id = { $in: this.user.key_work_resident_ids };
      }
    }

    try {
      const result = await base44.entities[entityName].filter(
        secureQuery,
        sort,
        limit
      );
      return result;
    } catch (error) {
      console.error(`SecureGateway.filter error [${entityName}]:`, error);
      throw error;
    }
  }

  async get(entityName, id) {
    if (!this.user) throw new Error('User not authenticated');

    try {
      const entity = await base44.entities[entityName].get(id);
      
      // Verify user has access
      if (entity.org_id !== this.user.org_id) {
        throw new Error('Access denied: org_id mismatch');
      }

      return entity;
    } catch (error) {
      console.error(`SecureGateway.get error [${entityName}]:`, error);
      throw error;
    }
  }

  async create(entityName, data) {
    if (!this.user) throw new Error('User not authenticated');

    const secureData = {
      ...data,
      org_id: this.user.org_id,
      created_by: this.user.email,
    };

    try {
      return await base44.entities[entityName].create(secureData);
    } catch (error) {
      console.error(`SecureGateway.create error [${entityName}]:`, error);
      throw error;
    }
  }

  async update(entityName, id, data) {
    if (!this.user) throw new Error('User not authenticated');

    try {
      return await base44.entities[entityName].update(id, data);
    } catch (error) {
      console.error(`SecureGateway.update error [${entityName}]:`, error);
      throw error;
    }
  }

  async delete(entityName, id) {
    if (!this.user) throw new Error('User not authenticated');

    try {
      return await base44.entities[entityName].delete(id);
    } catch (error) {
      console.error(`SecureGateway.delete error [${entityName}]:`, error);
      throw error;
    }
  }

  async bulkCreate(entityName, dataArray) {
    if (!this.user) throw new Error('User not authenticated');

    const secureData = dataArray.map(item => ({
      ...item,
      org_id: this.user.org_id,
      created_by: this.user.email,
    }));

    try {
      return await base44.entities[entityName].bulkCreate(secureData);
    } catch (error) {
      console.error(`SecureGateway.bulkCreate error [${entityName}]:`, error);
      throw error;
    }
  }
}

export const secureGateway = new SecureGateway();
```

### 6.3 Initialization (AuthContext.jsx)

```javascript
import { secureGateway } from '@/lib/secureGateway';

const { user } = useAuth();

useEffect(() => {
  if (user) {
    secureGateway.setUser(user);
  }
}, [user]);
```

### 6.4 Usage in Components

```javascript
const { data: residents } = useQuery({
  queryKey: ['residents', 'active'],
  queryFn: () => secureGateway.filter('Resident', { status: 'active' }),
});

const createMutation = useMutation({
  mutationFn: (data) => secureGateway.create('Resident', data),
});
```

---

## 7. State Lifting & Context

### 7.1 AuthContext (User & Session State)

**lib/AuthContext.jsx:**
```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        if (error.type === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered' });
        } else {
          setAuthError({ type: 'auth_required' });
        }
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoadingAuth, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

### 7.2 Lifting State Between Siblings

**Example: Resident Detail Modal**
```javascript
function ResidentsPage() {
  const [selectedResident, setSelectedResident] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <ResidentList onSelect={setSelectedResident} />
      {selectedResident && (
        <ResidentModal
          resident={selectedResident}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setSelectedResident(null)}
        />
      )}
    </>
  );
}
```

### 7.3 Avoiding Prop Drilling

**Without Context (bad):**
```javascript
// Theme needs to pass through 10 levels
<Page theme={theme}>
  <Section theme={theme}>
    <Card theme={theme}>
      <Button theme={theme} />
    </Card>
  </Section>
</Page>
```

**With Context (good):**
```javascript
const ThemeContext = createContext();

<ThemeProvider value={theme}>
  <Page>
    <Section>
      <Card>
        <Button />  {/* useContext(ThemeContext) inside */}
      </Card>
    </Section>
  </Page>
</ThemeProvider>
```

---

## Appendix: Cache Key Reference

**All active cache keys in the app:**

| Entity | Key Pattern | Invalidate On |
|--------|------------|---------------|
| Residents | `['residents', ...filters]` | Create/Update/Delete Resident |
| Staff | `['staff', ...filters]` | Create/Update/Delete Staff |
| Homes | `['homes', ...filters]` | Create/Update/Delete Home |
| Support Plans | `['support-plans', resident_id]` | Create/Update Plan |
| Risk Assessments | `['risk-assessments', resident_id]` | Create/Update Assessment |
| Appointments | `['appointments', ...filters]` | Create/Update Appointment |
| Timesheets | `['timesheets', ...filters]` | Submit/Approve Timesheet |
| Compliance | `['compliance', 'ofsted-score']` | Any home/resident/staff change |
| Dashboard | `['dashboard', role, home_id]` | Periodic refresh (5min) |

---

**Document Version:** 1.0  
**Last Updated:** May 2, 2026  
**Distribution:** Frontend developers, React architects