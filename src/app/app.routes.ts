import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./modules/auth/auth.module').then(m => m.AuthModule),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./modules/admin/admin.module').then(m => m.AdminModule),
  },
  {
    path: 'user',
    loadChildren: () =>
      import('./modules/user/user.module').then(m => m.UserModule),
  },
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
];
