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
      label: 'Careers',
      route: '/app/careers',
      roles: [UserRole.STUDENT]
    },
    {
      label: 'HR portal',
      route: '/app/hr',
      roles: [UserRole.LOGISTICS_STAFF, UserRole.SUPER_ADMIN]
    },
    {
      label: 'HR admin',
      route: '/app/hr/admin/overview',
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
  isHrMenuOpen = false;

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

  getVisibleMainNavItems(): NavItem[] {
    return this.getVisibleNavItems().filter(item => !this.isHrRoute(item.route));
  }

  getVisibleHrItems(): NavItem[] {
    return this.getVisibleNavItems().filter(item => this.isHrRoute(item.route));
  }

  hasHrItems(): boolean {
    return this.getVisibleHrItems().length > 0;
  }

  toggleHrMenu(): void {
    this.isHrMenuOpen = !this.isHrMenuOpen;
  }

  openHrMenu(): void {
    this.isHrMenuOpen = true;
  }

  closeHrMenu(): void {
    if (!this.isHrSectionActive()) {
      this.isHrMenuOpen = false;
    }
  }

  isHrSectionExpanded(): boolean {
    return this.isHrMenuOpen || this.isHrSectionActive();
  }

  isHrSectionActive(): boolean {
    return this.router.url.startsWith('/app/hr');
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`.toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private isHrRoute(route: string): boolean {
    return route.startsWith('/app/hr');
  }
}
