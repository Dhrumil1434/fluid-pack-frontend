# Admin User Management — UI/UX Spec

This document defines tokens, components, icons, and interaction rules for the Admin / All Users page. It references palette and typography from `docs/design.md`.

## Tokens & Colors

- Backgrounds: `--color-bg`, `--color-bg-soft`
- Text: `--color-text`, `--color-text-muted`
- Borders: `--color-neutral-300`
- Primary: `--color-primary`, `--color-primary-light`, `--color-primary-dark`
- Severities: `--color-success`, `--color-warning`, `--color-error`, `--color-info`

## Components (PrimeNG)

- Inputs: `pInputText`, `p-select`, `p-datepicker`, `p-chip`, `p-toolbar`, `p-splitButton`, `p-tag`, `p-table`, `p-menu`, `p-dialog`, `p-toast`

## Icons (PrimeIcons)

- Header: `pi-bars`, `pi-home`, `pi-refresh`, `pi-question-circle`, `pi-user-plus`
- Filters: `pi-search`, `pi-filter-slash`, `pi-download`
- Table: `pi-sliders-h` (density), `pi-eye` (columns), `pi-sort`
- Row actions: `pi-eye`, `pi-check`, `pi-times`, `pi-pencil`, `pi-trash`
- Status: `pi-check-circle` (Approved), `pi-clock` (Pending)

## Visual Rules

- Cards: `bg-bg border border-neutral-300 rounded-xl shadow-medium`
- Dialogs: attach `styleClass="fp-dialog"` (global styles map tokens to PrimeNG)
- Buttons: use severity (`success/info/warning/danger`) and `[text]/[outlined]` combinations
- Tags: severity mapped to token colors

## Interactions

- Motion: `transition-all duration-150 active:scale-95 hover:brightness-110`
- Feedback: toasts for success/error; confirm dialogs for destructive actions
- Loaders: table overlay + skeleton; KPI card loader only; no global overlay here

## Accessibility

- Tooltips/labels for icon-only buttons; focus rings; min 32×32px targets

## API Mapping

- GET `/api/user?page&limit&sortBy&sortOrder` — table
- GET `/api/user/statistics` — KPIs
- PATCH `/api/user/:id/approve` — approve/reject with `notes?`
- PUT `/api/user/:id` — edit
- POST `/api/user` (or `/user/register`) — create
- DELETE `/api/user/:id` — delete
- GET `/api/admin/roles` — populate Role filter from DB (no hardcoded lists)
- GET `/api/admin/departments` — populate Department filter from DB (no hardcoded lists)
- Planned: `POST /api/user/bulk-approve`, `GET /api/user/export?format`

## Responsive

- Desktop: full layout; sticky header on table
- Tablet: filters 2-column; table scrolls horizontally
- Mobile: filters stacked; optional card list view

---

## Response Shapes / Types (reference)

```ts
// GET /api/user?page&limit&sortBy&sortOrder
interface UsersListApiResponse {
  statusCode: number;
  message: string;
  data: {
    users: Array<{
      _id: string;
      username: string;
      email: string;
      isApproved: boolean;
      role: { _id: string; name: string };
      department: { _id: string; name: string };
      createdAt: string; // ISO
      updatedAt: string; // ISO
      lastLogin?: string; // ISO
    }>;
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  };
}

// GET /api/user/statistics
interface UserStatisticsApiResponse {
  statusCode: number;
  message: string;
  data: {
    totalUsers: number;
    approvedUsers: number;
    pendingUsers: number;
    usersByRole?: Array<{ _id: string; name: string; count: number }>;
    usersByDepartment?: Array<{ _id: string; name: string; count: number }>;
  };
}

// PATCH /api/user/:id/approve
interface ApproveUserRequest {
  approved: boolean;
  notes?: string;
}
interface ApproveUserApiResponse {
  statusCode: number;
  message: string;
  data: { _id: string; isApproved: boolean };
}

// PUT /api/user/:id
interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: string; // roleId
  department?: string; // departmentId
  isApproved?: boolean;
}

// POST /api/user  (or /user/register)
interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  department: string;
}

// GET /api/admin/roles
type RolesListApiResponse = {
  statusCode: number;
  message: string;
  data: Array<{ _id: string; name: string }>;
};

// GET /api/admin/departments
type DepartmentsListApiResponse = {
  statusCode: number;
  message: string;
  data: Array<{ _id: string; name: string }>;
};
```
