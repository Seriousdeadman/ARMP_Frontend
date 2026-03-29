import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { HrService } from '../../services/hr.service';
import { User, UserRole } from '../../models/user.models';
import { filterHrMenu, HrMenuBootstrap, HrMenuGroup, isHrWorkspaceUrl } from '../../hr/hr-menu.config';

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
  hrBootstrap: HrMenuBootstrap | null = null;
  hrMenuGroups: HrMenuGroup[] = [];

  constructor(
    private authService: AuthService,
    private hrService: HrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(
      switchMap(user => {
        this.currentUser = user;
        if (!user || !this.needsHrBootstrap(user.role)) {
          this.hrBootstrap = null;
          this.refreshHrMenuGroups();
          return of<HrMenuBootstrap | null>(null);
        }
        return forkJoin({
          leave: this.hrService.getLeaveSummary(),
          app: this.hrService.getApplicationStatus()
        }).pipe(
          map(({ leave, app }) => ({
            employeeFound: leave?.employeeFound === true,
            candidateFound: app?.candidateFound === true
          })),
          catchError(() => of<HrMenuBootstrap | null>(null))
        );
      })
    ).subscribe(ctx => {
      this.hrBootstrap = ctx;
      this.refreshHrMenuGroups();
    });
  }

  private needsHrBootstrap(role: UserRole): boolean {
    return (
      role === UserRole.STUDENT ||
      role === UserRole.TEACHER ||
      role === UserRole.LOGISTICS_STAFF ||
      role === UserRole.SUPER_ADMIN
    );
  }

  getVisibleNavItems(): NavItem[] {
    return this.navItems.filter(item => {
      if (!item.roles) {
        return true;
      }
      if (!this.currentUser) {
        return false;
      }
      return item.roles.includes(this.currentUser.role);
    });
  }

  private refreshHrMenuGroups(): void {
    this.hrMenuGroups = filterHrMenu(this.currentUser?.role, this.hrBootstrap ?? undefined);
  }

  hasHrMenu(): boolean {
    return this.hrMenuGroups.length > 0;
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
    const url = this.router.url.split('?')[0];
    if (isHrWorkspaceUrl(url)) {
      return true;
    }
    if (this.currentUser?.role === UserRole.STUDENT && url.startsWith('/app/careers')) {
      return true;
    }
    return false;
  }

  hrLinkActiveOptions(route: string): IsActiveMatchOptions {
    if (route === '/app/hr') {
      return {
        paths: 'exact',
        matrixParams: 'ignored',
        queryParams: 'ignored',
        fragment: 'ignored'
      };
    }
    return {
      paths: 'subset',
      matrixParams: 'ignored',
      queryParams: 'ignored',
      fragment: 'ignored'
    };
  }

  getUserInitials(): string {
    if (!this.currentUser) {
      return '';
    }
    const first = (this.currentUser.firstName ?? '').trim();
    const last = (this.currentUser.lastName ?? '').trim();
    const a = first.charAt(0) || '?';
    const b = last.charAt(0) || '?';
    return `${a}${b}`.toUpperCase();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
