import { UserRole } from '../models/user.models';
import type { ApplicationStatusResponse, LeaveSummaryResponse } from '../services/hr.service';

export type HrPortalView =
  | 'career'
  | 'employee'
  | 'dual'
  | 'opsOnly';

export interface HrPortalModeContext {
  role: UserRole;
  employeeFound: boolean;
  candidateFound: boolean;
}

export function resolveHrPortalView(ctx: HrPortalModeContext): HrPortalView {
  const { role, employeeFound, candidateFound } = ctx;

  if (role === UserRole.LOGISTICS_STAFF || role === UserRole.SUPER_ADMIN) {
    if (employeeFound) {
      return 'employee';
    }
    return 'opsOnly';
  }

  if (employeeFound) {
    if (role === UserRole.STUDENT && candidateFound) {
      return 'dual';
    }
    return 'employee';
  }

  if (role === UserRole.STUDENT) {
    return 'career';
  }

  if (role === UserRole.TEACHER || role === UserRole.REGULAR_STAFF) {
    return 'employee';
  }

  return 'career';
}

export function buildPortalModeContext(
  role: UserRole,
  leave: LeaveSummaryResponse | null,
  application: ApplicationStatusResponse | null
): HrPortalModeContext {
  return {
    role,
    employeeFound: leave?.employeeFound === true,
    candidateFound: application?.candidateFound === true
  };
}

export function showCareerSection(view: HrPortalView): boolean {
  return view === 'career' || view === 'dual';
}

export function showEmployeeSection(view: HrPortalView, employeeFound: boolean): boolean {
  if (view === 'opsOnly') {
    return employeeFound;
  }
  if (view === 'dual') {
    return true;
  }
  return view === 'employee';
}
