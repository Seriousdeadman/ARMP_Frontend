import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.models';

interface NavItem {
  label: string;
  route: string;
  roles?: UserRole[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ShellComponent implements OnInit {

  currentUser: User | null = null;

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/app/dashboard' },
    { label: 'Parking', route: '/app/parking' },
    { label: 'Dining hall', route: '/app/dining' },
    { label: 'Dormitory', route: '/app/dormitory' },
    { label: 'Classes', route: '/app/classes' },
    { label: 'Clubs & life', route: '/app/clubs' },
    {
      label: 'HR & staff',
      route: '/app/hr',
      roles: [UserRole.LOGISTICS_STAFF, UserRole.SUPER_ADMIN]
    },
    {
      label: 'Admin',
      route: '/app/admin',
      roles: [UserRole.SUPER_ADMIN]
    }
  ];

  accountItems: NavItem[] = [
    { label: 'Profile', route: '/app/profile' },
    { label: 'Activity', route: '/app/activity' },
    { label: 'Settings', route: '/app/settings' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  getVisibleNavItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (!item.roles) return true;
      if (!this.currentUser) return false;
      return item.roles.includes(this.currentUser.role);
    });
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`.toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
