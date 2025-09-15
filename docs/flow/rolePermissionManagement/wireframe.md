# Admin — Roles & Permissions — Wireframes

Purpose: High-level structural blueprints for Roles and Permission Rules tabs. Styling lives in `ui-ux.md`.

## 1) Page Shell

```
+----------------------------------------------------------------------------------+
| [≡] Dashboard / Roles & Permissions                           [⟳] [ + Add Role ] |
+----------------------------------------------------------------------------------+
| Tabs: [ Roles ] [ Permission Rules ]                                            |
+----------------------------------------------------------------------------------+
| (Tab body)                                                                      |
+----------------------------------------------------------------------------------+
```

## 2) Roles Tab

```
Toolbar: [🔎 Search................]         [ + Add Role ] [ Clear ]

Table
  Columns: Name | Description | Users | Created | Actions
  Row:     Admin | Full access | 12    | Sep 1   | [✎ Edit][🗑 Delete]
  Row:     Manager | ...       | 8     | Sep 2   | [✎][🗑]

Paginator: « ‹ 1 2 3 › »  Rows: 10  |  Showing x–y of z
```

Dialogs

- Add/Edit Role

```
+---------------- Add Role ----------------+
| Name: [....................]             |
| Description: [......................]    |
| [Cancel]                      [ Save ]   |
+-----------------------------------------+
```

## 3) Permission Rules Tab

```
Toolbar: [🔎 Search........]  Action [▼]  Role [▼]  Dept [▼]  Category [▼]  Status [▼]
         [ + Add Rule ]  [ Clear Filters ]

Table
  Columns: Name | Action | Applies To | Permission | Max Value | Priority | Active | Updated | Actions
  Row:     Create <=50K | createMachine | Role: Manager | Allowed | 50000 | 10 | ✓ | Sep 2 | [👁][✎][⏻][🗑]

Legend: [⏻] Toggle active

Paginator: « ‹ 1 2 3 › »  Rows: 10  |  Showing x–y of z
```

Dialogs

- View Rule (read-only details)
- Add/Edit Rule (see fields in UI/UX spec)

## 4) Empty States

- Roles: “No roles found. Create your first role.” [ + Add Role ]
- Rules: “No rules configured.” [ + Add Rule ] [ Clear Filters ]

## 5) Mobile

- Filters stack; table scrolls horizontally; chips for scopes collapse under name.
