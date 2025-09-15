# Admin — Role & Permission Management — UI/UX Spec

This spec defines the visual system, interactions, and component behaviors for Role & Permission Management. Follow tokens and patterns from `docs/design.md` and mirror Admin › User Management flows for consistency.

## Goals

- Provide CRUD for Roles
- Provide CRUD for Permission Configs (rule-based access matrix)
- Optional: View-only Departments list where needed for filters/relations
- Keep parity with User Management in layout, loaders, dialogs, and URL sync

## Tokens & Themes

- Colors, typography, spacing: reuse from `docs/design.md`
- Containers: `bg-bg border border-neutral-300 rounded-xl shadow-medium`
- Buttons: primary/secondary per `design.md`; destructive uses danger severity
- Focus: `focus:ring-2 focus:ring-primary/50`

## Navigation & Information Architecture

- Sidebar: Admin › User Management
  - Users
  - Roles & Permissions (new)
- Breadcrumb: Dashboard / Roles & Permissions
- Tabs inside page (desktop):
  - Roles
  - Permission Rules

## Common Components

- PrimeNG: `p-toolbar`, `p-table`, `p-dialog`, `p-confirmDialog`, `p-toast`, `p-inputText`, `p-dropdown`, `p-multiSelect`, `p-calendar`, `p-chip`, `p-badge`, `p-splitButton`
- Shared UX rules from User Management:
  - Debounced search in filters
  - Table overlay loader + skeleton on first load
  - Confirm dialog for delete
  - Toast for success/error
  - Compact/comfortable density toggle
  - Column visibility menu
  - Pagination with URL query sync

## Page Shell

- Header: title, refresh button, primary actions (Add Role / Add Rule)
- KPI strip (optional, later): total roles, active rules
- Filters per tab
- Table
- Paginator

## Roles Tab

- Toolbar: Search, Add Role
- Table Columns: Name, Description, Users Count (optional), Created, Actions
- Row Actions: Edit, Delete
- Dialogs:
  - Add/Edit Role
    - Fields: Name (required), Description (optional)
    - Validation: unique name constraint; show API error inline
- Interactions:
  - Search: debounced `350ms`, filters table only
  - Sorting: by Name, Created
  - Pagination: 5/10/20

## Permission Rules Tab

- Concept: Configurable rules controlling actions (e.g., createMachine, approveMachine)
- Toolbar: Search, Add Rule, Actions: Clear Filters
- Filters:
  - Action (dropdown from enum)
  - Role (multi-select)
  - Department (multi-select)
  - Category (multi-select)
  - Status: Active/Inactive
- Table Columns:
  - Name
  - Action
  - Applies To: chips for Role/Dept/Category/User scopes
  - Permission: Allowed / Requires Approval / Denied (with severity tag)
  - Max Value (if applicable)
  - Priority
  - Active
  - Updated
  - Actions: View, Edit, Toggle, Delete
- Row Actions:
  - View: read-only dialog showing expanded JSON-like details
  - Edit: same form as create with populated values
  - Toggle: active/inactive (PATCH)
  - Delete: soft delete (sets inactive) or hard delete per API; confirm dialog
- Dialog: Add/Edit Rule
  - Fields:
    - Name (required)
    - Description (optional)
    - Action (required; enum)
    - Permission (required; enum: Allowed, Requires Approval, Denied)
    - Approver Roles (multi-select; visible if Requires Approval)
    - Role(s) (multi-select)
    - Department(s) (multi-select)
    - Category(s) (multi-select)
    - User(s) (multi-select)
    - Max Value (number; optional)
    - Priority (integer; higher first; must be unique per active action per backend validation)
    - Active (checkbox)
  - Validation feedback mirrors backend error codes

## Reusable Components from User Management

- Filters form pattern with debounced search, apply/clear actions
- `UserTableComponent` patterns → replicate as `RoleTableComponent` and `PermissionRuleTableComponent`
- Confirm dialog usage for delete
- Toast service for success/errors
- URL query sync helpers for page/limit/sort

## States

- Loading: skeleton rows for first load; spinner overlay on subsequent loads
- Empty: illustration + “No rules yet. Create your first rule.” + Add Rule CTA
- Error: inline error row + Retry button + toast

## Accessibility

- Icon-only buttons have `aria-label`
- Keyboard focus order respects toolbar → table → dialogs
- Minimum 32×32px targets

## Responsive

- Tablet: filters two columns; table horizontal scroll
- Mobile: stacked filters; consider list-row layout for table

## Behavior Parity With User Management

- URL Sync: `page`, `limit`, `sortBy`, `sortOrder`
- Debounced search only auto-applies search field
- Confirmations before destructive actions
- Toasts for all CRUD outcomes

## Visual Examples (classes only)

- Primary button: `px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-light`
- Card: `bg-bg border border-neutral-300 rounded-xl shadow-medium p-6`
