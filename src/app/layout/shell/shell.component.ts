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

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/app/dashboard' },
    { label: 'Admin', route: '/app/admin', roles: [UserRole.SUPER_ADMIN] }
  ];

  accountItems: NavItem[] = [
    { label: 'Profile', route: '/app/profile' },
    { label: 'Activity', route: '/app/activity' },
    { label: 'Settings', route: '/app/settings' }
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
