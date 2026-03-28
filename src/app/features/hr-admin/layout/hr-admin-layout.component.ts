import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { filterHrMenu, HrMenuGroup } from '../../../hr/hr-menu.config';

@Component({
  selector: 'app-hr-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './hr-admin-layout.component.html',
  styleUrl: './hr-admin-layout.component.scss'
})
export class HrAdminLayoutComponent {
  private readonly authService = inject(AuthService);

  get menuGroups(): HrMenuGroup[] {
    const user = this.authService.getCurrentUser();
    return filterHrMenu(user?.role);
  }
}
