import { Routes } from '@angular/router';
import { AdminGuard } from '../../core/guards/admin.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./components/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'machines',
    loadComponent: () => import('./components/machine-management/machine-management.component').then(m => m.MachineManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'approvals',
    loadComponent: () => import('./components/approval-management/approval-management.component').then(m => m.ApprovalManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'categories',
    loadComponent: () => import('./components/category-management/category-management.component').then(m => m.CategoryManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'departments',
    loadComponent: () => import('./components/department-management/department-management.component').then(m => m.DepartmentManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'roles',
    loadComponent: () => import('./components/role-management/role-management.component').then(m => m.RoleManagementComponent),
    canActivate: [AdminGuard]
  },
  {
    path: 'permissions',
    loadComponent: () => import('./components/permission-management/permission-management.component').then(m => m.PermissionManagementComponent),
    canActivate: [AdminGuard]
  }
];
