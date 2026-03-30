import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShellComponent } from './shell/shell.component';
import { SharedModule } from '../shared/shared.module';
import { roleGuard } from '../guards/role.guard';
import { UserRole } from '../models/user.models';
import { ClassroomComponent } from '../features/resource/classroom/classroom.component';
import { LaboratoryComponent } from '../features/resource/laboratory/laboratory.component';
import { CollaborativeSpaceComponent } from '../features/resource/collaborative-space/collaborative-space.component';
import { EquipmentComponent } from '../features/resource/equipment/equipment.component';
import { UserClassroomComponent } from '../features/resource/user/classroom/user-classroom.component';
import { UserCollaborativeSpaceComponent } from '../features/resource/user/collaborative-space/user-collaborative-space.component';
import { UserEquipmentComponent } from '../features/resource/user/equipement/user-equipment.component';
import { UserLaboratoryComponent } from '../features/resource/user/laboratory/user-laboratory.component';
import { MyReservationsComponent } from '../features/resource/user/my-reservations/my-reservations.component';
import { SmartSuggestionComponent } from '../features/reservation/smart-suggestion/smart-suggestion.component';
import { AvailabilityCalendarComponent } from '../features/resource/availability-calendar/availability-calendar.component';
import { FullCalendarModule } from '@fullcalendar/angular'; // ← IMPORT THIS
import { ConflictResolverComponent } from '../features/reservation/conflict-resolver/conflict-resolver.component';

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
      },
      { path: 'browse/classrooms', component: UserClassroomComponent },
      { path: 'browse/laboratories', component: UserLaboratoryComponent },
      { path: 'browse/collaborative-spaces', component: UserCollaborativeSpaceComponent },
      { path: 'browse/equipment', component: UserEquipmentComponent },
      { path: 'classrooms', component: ClassroomComponent },
      { path: 'laboratories', component: LaboratoryComponent },
      { path: 'collaborative-spaces', component: CollaborativeSpaceComponent },
      { path: 'my-reservations', component: MyReservationsComponent },
      { path: 'smart-suggest', component: SmartSuggestionComponent },
      { path: 'availability', component: AvailabilityCalendarComponent},
      { path: 'equipment', component: EquipmentComponent }
    ]
  }
];

@NgModule({
  declarations: [
    ShellComponent,
    ClassroomComponent,
    LaboratoryComponent,
    CollaborativeSpaceComponent,
    EquipmentComponent,
   UserClassroomComponent,
UserLaboratoryComponent,
UserCollaborativeSpaceComponent,
UserEquipmentComponent,
MyReservationsComponent,
SmartSuggestionComponent,
AvailabilityCalendarComponent,
ConflictResolverComponent ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    SharedModule,
    FullCalendarModule
  ]
})
export class LayoutModule {}