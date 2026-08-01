import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'chat', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/signup/signup.component').then(m => m.SignupComponent)
  },

  // Authenticated area — wrapped in the shell layout
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat.component').then(m => m.ChatComponent)
      },
      {
        path: 'upload',
        loadComponent: () =>
          import('./features/upload/upload.component').then(m => m.UploadComponent)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      }
    ]
  },

  { path: '**', redirectTo: 'chat' }
];
