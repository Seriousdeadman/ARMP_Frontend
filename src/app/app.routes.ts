import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { UserRole } from './models/user.models';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component')
        .then(m => m.RegisterComponent)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component')
        .then(m => m.ShellComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component')
            .then(m => m.ProfileComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component')
            .then(m => m.SettingsComponent)
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./features/activity/activity.component')
            .then(m => m.ActivityComponent)
      },
      {
        path: 'parking',
        data: { title: 'Parking' },
        loadComponent: () =>
          import('./features/campus-module-placeholder/campus-module-placeholder.component')
            .then(m => m.CampusModulePlaceholderComponent)
      },
      {
        path: 'dining',
        data: { title: 'Dining hall' },
        loadComponent: () =>
          import('./features/campus-module-placeholder/campus-module-placeholder.component')
            .then(m => m.CampusModulePlaceholderComponent)
      },
      {
        path: 'dormitory',
        data: { title: 'Dormitory' },
        loadComponent: () =>
          import('./features/campus-module-placeholder/campus-module-placeholder.component')
            .then(m => m.CampusModulePlaceholderComponent)
      },
      {
        path: 'classes',
        data: { title: 'Classes' },
        loadComponent: () =>
          import('./features/campus-module-placeholder/campus-module-placeholder.component')
            .then(m => m.CampusModulePlaceholderComponent)
      },
      {
        path: 'clubs',
        data: { title: 'Clubs & life' },
        loadComponent: () =>
          import('./features/campus-module-placeholder/campus-module-placeholder.component')
            .then(m => m.CampusModulePlaceholderComponent)
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { role: UserRole.SUPER_ADMIN },
        loadComponent: () =>
          import('./features/admin/admin.component')
            .then(m => m.AdminComponent)
      },
      {
        path: 'hr',
        children: [
          {
            path: '',
            pathMatch: 'full',
            canActivate: [roleGuard],
            data: {
              roles: [
                UserRole.STUDENT,
                UserRole.TEACHER,
                UserRole.REGULAR_STAFF,
                UserRole.LOGISTICS_STAFF,
                UserRole.SUPER_ADMIN
              ]
            },
            loadComponent: () =>
              import('./features/hr-portal/hr-portal.component')
                .then(m => m.HrPortalComponent)
          },
          {
            path: 'admin',
            canActivate: [roleGuard],
            data: { roles: [UserRole.LOGISTICS_STAFF, UserRole.SUPER_ADMIN] },
            loadComponent: () =>
              import('./features/hr-admin/layout/hr-admin-layout.component')
                .then(m => m.HrAdminLayoutComponent),
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'talent-board' },
              {
                path: 'talent-board',
                loadComponent: () =>
                  import('./features/hr-admin/pages/hr-admin-talent-board.component')
                    .then(m => m.HrAdminTalentBoardComponent)
              },
              {
                path: 'candidates',
                redirectTo: 'talent-board',
                pathMatch: 'full'
              },
              {
                path: 'overview',
                redirectTo: 'talent-board',
                pathMatch: 'full'
              },
              {
                path: 'interviews',
                loadComponent: () =>
                  import('./features/hr-admin/pages/hr-admin-interviews.component')
                    .then(m => m.HrAdminInterviewsComponent)
              },
              {
                path: 'employees',
                loadComponent: () =>
                  import('./features/hr-admin/pages/hr-admin-employees.component')
                    .then(m => m.HrAdminEmployeesComponent)
              },
              {
                path: 'leaves',
                loadComponent: () =>
                  import('./features/hr-admin/pages/hr-admin-leaves.component')
                    .then(m => m.HrAdminLeavesComponent)
              },
              {
                path: 'onboarding',
                canActivate: [roleGuard],
                data: { role: UserRole.SUPER_ADMIN },
                loadComponent: () =>
                  import('./features/hr-admin/pages/hr-admin-onboarding.component')
                    .then(m => m.HrAdminOnboardingComponent)
              },
              {
                path: 'payroll',
                canActivate: [roleGuard],
                data: { role: UserRole.SUPER_ADMIN },
                loadComponent: () =>
                  import('./features/hr-admin/pages/hr-admin-payroll.component')
                    .then(m => m.HrAdminPayrollComponent)
              },
              {
                path: 'grades',
                canActivate: [roleGuard],
                data: { role: UserRole.SUPER_ADMIN },
                loadComponent: () =>
                  import('./features/hr-admin/pages/hr-admin-grades.component')
                    .then(m => m.HrAdminGradesComponent)
              },
              {
                path: 'departments',
                canActivate: [roleGuard],
                data: { role: UserRole.SUPER_ADMIN },
                loadComponent: () =>
                  import('./features/hr-admin/pages/hr-admin-departments.component')
                    .then(m => m.HrAdminDepartmentsComponent)
              }
            ]
          }
        ]
      },
      {
        path: 'careers',
        redirectTo: 'hr',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '403',
    loadComponent: () =>
      import('./features/errors/forbidden/forbidden.component')
        .then(m => m.ForbiddenComponent)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
