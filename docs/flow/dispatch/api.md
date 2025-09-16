# Dispatch — Technician/Manager — Backend Endpoints

This maps the dispatch flow for technician (create/modify) and manager/admin (approve/reject with remarks), reusing existing backend.

## Base paths

- Machines: `/api/machines`
- Machine Approvals: `/api/machine-approvals`
- Permission Rules: `/api/permission`

## Technician

- Create Machine (requires permission rules):
  - POST `/api/machines`
  - body: `{ name, category_id, images?, metadata? }`
  - result: machine created with `is_approved=false`

- My Recent Machines (last 5):
  - GET `/api/machines/my/recent?limit=5`
  - auth: required
  - returns `{ machines, total, pages }` with most recent first

- List my machines (any count):
  - GET `/api/machines?created_by={me}&page=1&limit=10`

- Request approval for modification (or creation if needed by policy):
  - POST `/api/machine-approvals`
  - body:
    - `machineId: string`
    - `approvalType: 'MACHINE_CREATION' | 'MACHINE_EDIT' | 'MACHINE_DELETION'`
    - `proposedChanges: Record<string, unknown>`
    - `originalData?: Record<string, unknown>`
    - `requestNotes?: string`

- Track my approval requests:
  - GET `/api/machine-approvals/my-requests?page&limit`

## Manager / Admin

- Pending approvals:
  - GET `/api/machine-approvals/pending?page&limit`

- Process (approve/reject with remarks):
  - PATCH `/api/machine-approvals/:id/process`
  - body:
    - `approved: boolean`
    - `approverNotes?: string`
    - `rejectionReason?: string` (required when `approved=false`)

## Permission Checks

- Rule-based via `/api/permission` with seeded defaults:
  - Roles: `admin`, `manager1`, `technician`
  - Departments: `dispatch`, `qa`
  - Approvers: default `admin`; `dispatch` → `admin`, `manager1`

Notes: For flows requiring rejection remarks, use the approval endpoints instead of direct `PATCH /api/machines/:id/approval`.
