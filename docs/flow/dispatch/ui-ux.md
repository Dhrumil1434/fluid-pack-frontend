# Dispatch — Technician/Manager — UI/UX Spec

Follow `docs/design.md` and mirror Admin dashboard shell (sidebar, header, content). Reuse patterns from User Management and Roles/Permissions.

## Navigation & IA

- Sidebar: Dashboard
  - Dispatch › Technician
  - Dispatch › Approvals (Manager/Admin)
- Breadcrumbs reflect current page.

## Technician Dashboard

- Header: title + actions (Create Machine)
- Widgets:
  - My Recent Machines (table, last 5)
    - Columns: Name, Category, Created, Status (Approved/Pending)
    - Row click → Machine details
  - Quick Actions: Create Machine (opens dialog/page)
- States: loading skeleton, empty state with CTA

## Manager/Admin Approvals

- Header: title + refresh
- Filters: Status (Pending, Approved, Rejected), Type, Requester
- Table: Pending Approvals (default tab)
  - Columns: Machine, Type, Requested By, Created, Notes, Actions
  - Row Actions: View Details, Approve, Reject (Reject requires Reason)
- Dialogs:
  - View Approval: show `originalData` vs `proposedChanges`
  - Approve/Reject: textarea for `approverNotes`, and `rejectionReason` when rejecting
- States: loading skeleton, empty state

## Components & Tokens

- Use PrimeNG components per `docs/flow/rolePermissionManagement/ui-ux.md` (toolbar, table, dialog, confirm, toast)
- Styles: from `docs/design.md` tokens; cards `bg-bg border border-neutral-300 rounded-xl shadow-medium`

## Behaviors

- Technician list uses GET `/api/machines/my/recent?limit=5`
- Approvals use GET `/api/machine-approvals/pending` and PATCH `/api/machine-approvals/:id/process`
- Toast on success/error; confirm before reject; require reason when rejecting
