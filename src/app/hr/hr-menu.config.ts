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
}

const hrOpsRecruitment: HrMenuGroup = {
  id: 'recruitment',
  label: 'Recruitment',
  links: [
    { label: 'Talent Board', route: '/app/hr/admin/talent-board' },
    { label: 'Interview schedule', route: '/app/hr/admin/interviews' }
  ]
};

const hrOpsPeople: HrMenuGroup = {
  id: 'people',
  label: 'People',
  links: [
    { label: 'Employee directory', route: '/app/hr/admin/employees' },
    { label: 'Leave inbox', route: '/app/hr/admin/leaves' }
  ]
};

const superAdminGovernance: HrMenuGroup = {
  id: 'governance',
  label: 'Governance',
  links: [
    { label: 'Grades & salary', route: '/app/hr/admin/grades' },
    { label: 'Departments', route: '/app/hr/admin/departments' }
  ]
};

const myHrLeaveLinks: HrMenuLink[] = [
  { label: 'Leave & absences', route: '/app/hr' },
  { label: 'My profile', route: '/app/profile' }
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
        links: [...myHrLeaveLinks]
      });
    }
    groups.push({
      id: 'recruitment',
      label: 'My Career',
      links: [
        { label: 'Career status', route: '/app/hr' },
        { label: 'Apply & CV', route: '/app/careers' }
      ]
    });
    return groups;
  }

  if (role === UserRole.TEACHER) {
    return [
      {
        id: 'selfService',
        label: 'My HR & Leave',
        links: [...myHrLeaveLinks]
      }
    ];
  }

  if (role === UserRole.LOGISTICS_STAFF) {
    const groups: HrMenuGroup[] = [];
    if (employeeFound) {
      groups.push({
        id: 'selfService',
        label: 'My HR & Leave',
        links: [...myHrLeaveLinks]
      });
    }
    groups.push(hrOpsRecruitment, hrOpsPeople);
    return groups;
  }

  if (role === UserRole.SUPER_ADMIN) {
    const groups: HrMenuGroup[] = [];
    if (employeeFound) {
      groups.push({
        id: 'selfService',
        label: 'My HR & Leave',
        links: [...myHrLeaveLinks]
      });
    }
    groups.push(hrOpsRecruitment, hrOpsPeople, superAdminGovernance);
    return groups;
  }

  return [];
}

export function isHrWorkspaceUrl(url: string): boolean {
  return url.startsWith('/app/hr');
}
