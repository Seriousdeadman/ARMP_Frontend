import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { ForbiddenComponent } from './features/errors/forbidden/forbidden.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./features/auth/auth.module')
        .then(m => m.AuthModule)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./layout/layout.module')
        .then(m => m.LayoutModule)
  },
  {
    path: '403',
    component: ForbiddenComponent
  },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
