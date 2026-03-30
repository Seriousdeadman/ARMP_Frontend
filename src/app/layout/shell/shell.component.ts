import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { User, UserRole } from '../../models/user.models';
import { environment } from '../../../environments/environment.development';
import { filter, Subscription } from 'rxjs';

interface NavItem {
  label: string;
  route: string;
  group: string;
  roles?: UserRole[];
}

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit, OnDestroy {

  currentUser: User | null = null;
  sidebarOpen = false;
  private routerSubscription: Subscription | null = null;

  // ✅ GROUPS
  groups = ['Overview', 'Browse', 'Resources', 'Account'];

  // ✅ NAV ITEMS WITH GROUPS
  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/app/dashboard', group: 'Overview' },

    { label: 'Admin', route: '/app/admin', group: 'Overview', roles: [UserRole.SUPER_ADMIN] },

    // ✅ Browse group (your new structure)
    { label: 'Classrooms', route: '/app/browse/classrooms', group: 'Browse' },
    { label: 'Laboratories', route: '/app/browse/laboratories', group: 'Browse' },
    { label: 'Collab Spaces', route: '/app/browse/collaborative-spaces', group: 'Browse' },
    { label: 'Equipment', route: '/app/browse/equipment', group: 'Browse' },
    { label: 'My Reservations', route: '/app/my-reservations', group: 'Browse' },
    { label: 'Availability', route: '/app/availability', group: 'Browse' },
    { label: 'Smart Finder', route: '/app/smart-suggest', group: 'Browse' }
  ];

  // ✅ Account group items
  accountItems: NavItem[] = [
    { label: 'Profile', route: '/app/profile', group: 'Account' },
    { label: 'Activity', route: '/app/activity', group: 'Account' },
    { label: 'Settings', route: '/app/settings', group: 'Account' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.logPageVisit(event.urlAfterRedirects);
    });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  private logPageVisit(url: string): void {
    const module = this.extractModule(url);
    this.http.post(`${environment.apiUrl}/api/audit/log`, {
      action: 'PAGE_VISIT',
      module: module,
      page: url,
      method: 'GET',
      details: `Navigated to ${url}`
    }).subscribe();
  }

  private extractModule(url: string): string {
    const parts = url.split('/');
    return parts[2] || 'unknown';
  }

  // ✅ Filter by role
  getVisibleNavItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (!item.roles) return true;
      if (!this.currentUser) return false;
      return item.roles.includes(this.currentUser.role);
    });
  }

  // ✅ NEW: Get items by group (VERY IMPORTANT for HTML)
  getItemsByGroup(group: string): NavItem[] {
    return this.getVisibleNavItems().filter(item => item.group === group);
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    return `${this.currentUser.firstName[0]}${this.currentUser.lastName[0]}`.toUpperCase();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}