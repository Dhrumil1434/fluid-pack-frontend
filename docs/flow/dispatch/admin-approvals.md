## Admin/Manager Approval Flow (Dispatch)

This document specifies how admins/managers review and process approvals across Dispatch, starting with Machine Creation approvals. It builds on the completed Technician flow.

### Goals

- Centralize approvals (machines, user registrations, future items) in one Admin Approvals page.
- Scope visibility by approver role: admins/managers see only approvals targeted to their role.
- Provide clear actions (Approve/Reject), capture rejection reason, and reflect the outcome in the technician UI.

### Roles and Access

- Admin, Manager: Can view/process pending approvals relevant to their approver role.
- Technician: Cannot process approvals; sees request status on their Machines pages.

### Data Model Highlights

- `MachineApproval` (back-end):
  - `machineId`, `requestedBy`, `approvalType` (e.g., MACHINE_CREATION)
  - `status`: pending | approved | rejected | cancelled
  - `approverRoles`: [RoleId] — determines which roles see/act on it
  - `approverNotes`, `rejectionReason`, `approvedBy`, `rejectedBy`, `approvalDate`

### Endpoints (Back-end)

- GET `/api/machine-approvals/pending` → list approvals targeted to current user's role
- PATCH `/api/machine-approvals/:id/process` → body `{ approved: boolean, approverNotes?: string, rejectionReason?: string }`
- GET `/api/machines` → list machines (filters: `page`, `limit`, `search`, `created_by`, `is_approved`)

### Admin UI Structure

- Sidebar → Dispatch
  - Machines (full CRUD for admins)
  - Approvals (this page)

#### Approvals Page (Admin)

- Header: title + quick filters (All/Pending/Approved/Rejected)
- Table columns:
  - Type (e.g., Machine Creation)
  - Subject (e.g., Machine name + Category)
  - Requested By (username/email)
  - Requested On (date)
  - Status (chip: Pending/Approved/Rejected)
  - Actions (Approve/Reject)
- Pagination + search (by subject/requester)

#### Actions

- Approve:
  - PATCH `/process` with `{ approved: true, approverNotes? }`
  - Result: `Machine.is_approved = true` (handled server-side in approval workflow)
- Reject:
  - Prompt modal: require `rejectionReason`
  - PATCH `/process` with `{ approved: false, rejectionReason }`
  - Result: `Machine.is_approved = false`, reason stored for visibility

### Technician Visibility of Outcomes

- Technician Machines Page:
  - Status column shows Pending/Approved/Rejected
  - If Rejected, a "View Reason" action opens a modal with:
    - Machine: name, category
    - Rejected on, Rejected by
    - Rejection reason (required)
  - Optional: show last approver notes

### Create Machine Modal (Technician)

- Already implemented:
  - Name, Category, Images (5 max), Dynamic Metadata (unique keys)
  - Sends `multipart/form-data` with `metadata` as JSON string
  - If permission requires approval, success message indicates "Awaiting approval"

### Permission Model

- Middleware determines outcome for action `CREATE_MACHINE`:
  - Allowed → direct create (auto-approved for admins/managers if desired)
  - Requires Approval → machine created as pending + `MachineApproval` entry
  - Denied → 403
- `approverRoles` stored on `MachineApproval` → scopes visibility in admin list

### UX Patterns & Modals

- Approvals Table → row Actions:
  - Approve → confirm inline or small modal for optional notes
  - Reject → modal requiring reason (textarea, min length)
- Technician Machines → Rejection Details modal (read-only)
- Consistent components: buttons, chips, spacing, pagination same as user management pages

### Error Handling

- Show toast notifications for approve/reject outcomes
- Display validation errors from server (e.g., missing rejection reason)
- Network errors → unified error interceptor messaging

### Sorting/Filtering

- Sort: Newest, Oldest, Type, Status
- Filters: status (Pending/Approved/Rejected), type (Machine Creation, User Registration), date range

### Analytics (optional, later)

- Cards: Total Pending, Approved Today, Rejected Today
- Average decision time, SLA breaches (e.g., pending > 7 days)

### State Transitions

1. Technician creates → permission requires approval
2. System creates `Machine` (pending) + `MachineApproval(PENDING)`
3. Admin views → Approve/Reject
   4a) Approve → `MachineApproval.APPROVED`; machine becomes approved (visible accordingly)
   4b) Reject → `MachineApproval.REJECTED` with reason; technician sees rejection on list and reason modal

### Developer Notes

- Ensure GET pending approvals uses current user role to filter (`approverRoles`)
- In PATCH process decision, require `rejectionReason` when `approved=false`
- Front-end should refresh listings after decision and show snack/toast
- Keep AOT-friendly Angular templates (use `formControlName`, `formGroupName` with reactive forms)

### TODO (Implementation)

- Approvals page (admin) UI + service calls
- Reject reason modal + validation
- Technician rejection reason modal
- Add filters/sort on approvals list
- Optional cards (stats) and role-based scoping confirmation chip
