# Admin User Management — Wireframes

Purpose: High-level structural blueprint for the Admin / All Users page. Styling lives in ui-ux.md.

## 1) Page Shell

- Sticky header from dashboard: sidebar toggle, breadcrumbs, actions
- Content sections: KPI strip, Filters, Bulk actions, Users table

ASCII layout

```
+----------------------------------------------------------------------------------+
| [≡] Dashboard / All Users                                   [⟳] [ + Add User ]  |
+----------------------------------------------------------------------------------+
| KPIs: [ Users ][ Approved ][ Pending ]                                          |
+----------------------------------------------------------------------------------+
| Filters Card                                                                     |
|  Search  Role  Department  Status  Sort  |  Created From  Created To             |
|  Active Chips: [Status: Pending ×] [Dept: Dispatch ×]                           |
|  Toolbar: Clear | Refresh | Export ▼                                             |
+----------------------------------------------------------------------------------+
| Bulk Actions (when selection)  [Approve] [Reject] [Export] [Delete]              |
+----------------------------------------------------------------------------------+
| Users Table                                                                      |
|  Caption: [Density] [Columns ▼]                                                  |
|  ☐ | Username | Email | Role | Department | Status | Created | Actions           |
|  ☐ | john     | ...   | ...  | ...        | ✓Approved | Sep 1 | [👁][✔/✖][✎][🗑] |
|  ...                                                                              |
|  Paginator: « ‹ 1 2 3 › »  Rows: 10  |  Showing x–y of z                         |
+----------------------------------------------------------------------------------+
```

## 2) Modals & Dialogs

- Add User: username, email, password, role, department
- Edit User: username, email, role, department, isApproved
- Approve/Reject: notes textarea
- Details: profile summary, activity, permissions tabs

## 3) Empty States

- No results: illustration + “Clear filters” + “Add User” CTA

## 4) Mobile

- Filters stack; table scrolls horizontally; optional card list (Username, Email, Status, Actions)

## 5) API Touchpoints

- GET /api/user?page&limit&sortBy&sortOrder
- GET /api/user/statistics
- PATCH /api/user/:id/approve { approved, notes? }
- PUT /api/user/:id
- POST /api/user (or /user/register)
- DELETE /api/user/:id
- (Planned) POST /api/user/bulk-approve
- (Planned) GET /api/user/export?format

Notes: URL sync for filters; scoped loaders; duplicate-request guards.
