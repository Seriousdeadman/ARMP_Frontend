import { UserRole } from '../models/user.models';

export type HrMenuGroupId = 'recruitment' | 'people' | 'governance' | 'selfService';

export interface HrMenuLink {
  label: string;
  route: string;
}

export interface HrMenuGroup {
  id: HrMenuGroupId;
  label: string;
  links: HrMenuLink[];
}

export interface HrMenuBootstrap {
  employeeFound: boolean;
  candidateFound: boolean;
  /** True when leave-summary returned 403 (employee record exists but pending activation). */
  employeePendingValidation?: boolean;
}

const myProfileLeaveLinks: HrMenuLink[] = [
  { label: 'My Leave', route: '/app/hr' },
  { label: 'My Profile', route: '/app/profile' }
];

export function filterHrMenu(
  role: UserRole | undefined,
  bootstrap?: HrMenuBootstrap | null
): HrMenuGroup[] {
  if (!role) {
    return [];
  }

  const employeeFound = bootstrap?.employeeFound === true;

  if (role === UserRole.STUDENT) {
    const groups: HrMenuGroup[] = [];
    if (employeeFound) {
      groups.push({
        id: 'selfService',
        label: 'My HR & Leave',
        links: [...myProfileLeaveLinks]
      });
    }
    groups.push({
      id: 'recruitment',
      label: 'My Career',
      links: [
        { label: 'My Application', route: '/app/hr' },
        { label: 'CV Upload', route: '/app/careers' }
      ]
    });
    return groups;
  }

  if (role === UserRole.TEACHER || role === UserRole.REGULAR_STAFF) {
    return [
      {
        id: 'selfService',
        label: 'HR',
        links: [...myProfileLeaveLinks]
      }
    ];
  }

  if (role === UserRole.LOGISTICS_STAFF) {
    const groups: HrMenuGroup[] = [];
    if (employeeFound) {
      groups.push({
        id: 'selfService',
        label: 'My HR',
        links: [...myProfileLeaveLinks]
      });
    }
    groups.push({
      id: 'recruitment',
      label: 'Recruitment',
      links: [
        { label: 'Recruitment Board', route: '/app/hr/admin/talent-board' },
        { label: 'Interview schedule', route: '/app/hr/admin/interviews' }
      ]
    });
    groups.push({
      id: 'people',
      label: 'People',
      links: [
        { label: 'Employee Drafts', route: '/app/hr/admin/employees' },
        { label: 'Leave Inbox', route: '/app/hr/admin/leaves' }
      ]
    });
    return groups;
  }

  if (role === UserRole.SUPER_ADMIN) {
    const groups: HrMenuGroup[] = [];
    if (employeeFound) {
      groups.push({
        id: 'selfService',
        label: 'My HR',
        links: [...myProfileLeaveLinks]
      });
    }
    groups.push({
      id: 'recruitment',
      label: 'Recruitment',
      links: [
        { label: 'Recruitment Board', route: '/app/hr/admin/talent-board' },
        { label: 'Interview schedule', route: '/app/hr/admin/interviews' }
      ]
    });
    groups.push({
      id: 'people',
      label: 'People',
      links: [
        { label: 'Employee Drafts', route: '/app/hr/admin/employees' },
        { label: 'Leave Inbox', route: '/app/hr/admin/leaves' }
      ]
    });
    groups.push({
      id: 'governance',
      label: 'Governance',
      links: [
        { label: 'Payroll', route: '/app/hr/admin/payroll' },
        { label: 'Grade Management', route: '/app/hr/admin/grades' },
        { label: 'Departments', route: '/app/hr/admin/departments' }
      ]
    });
    return groups;
  }

  return [];
}

export function isHrWorkspaceUrl(url: string): boolean {
  return url.startsWith('/app/hr');
}
