import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ShellComponent } from './shell/shell.component';
import { SharedModule } from '../shared/shared.module';
import { roleGuard } from '../guards/role.guard';
import { UserRole } from '../models/user.models';

const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../features/dashboard/dashboard.module')
            .then(m => m.DashboardModule)
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('../features/profile/profile.module')
            .then(m => m.ProfileModule)
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('../features/settings/settings.module')
            .then(m => m.SettingsModule)
      },
      {
        path: 'activity',
        loadChildren: () =>
          import('../features/activity/activity.module')
            .then(m => m.ActivityModule)
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { role: UserRole.SUPER_ADMIN },
        loadChildren: () =>
          import('../features/admin/admin.module')
            .then(m => m.AdminModule)
      }
    ]
  }
];

@NgModule({
  declarations: [ShellComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule
  ]
})
export class LayoutModule {}
