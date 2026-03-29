import { UserRole } from '../models/user.models';
import {
  buildPortalModeContext,
  resolveHrPortalView,
  showCareerSection,
  showEmployeeSection
} from './hr-portal-mode';

describe('hr-portal-mode', () => {
  it('student without employee is career', () => {
    const ctx = buildPortalModeContext(UserRole.STUDENT, { employeeFound: false }, { candidateFound: true });
    expect(resolveHrPortalView(ctx)).toBe('career');
    expect(showCareerSection('career')).toBe(true);
  });

  it('student with employee is dual when candidate exists', () => {
    const ctx = buildPortalModeContext(UserRole.STUDENT, { employeeFound: true }, { candidateFound: true });
    expect(resolveHrPortalView(ctx)).toBe('dual');
  });

  it('student with employee only is employee', () => {
    const ctx = buildPortalModeContext(UserRole.STUDENT, { employeeFound: true }, { candidateFound: false });
    expect(resolveHrPortalView(ctx)).toBe('employee');
  });

  it('teacher without employee is employee view (empty state)', () => {
    const ctx = buildPortalModeContext(UserRole.TEACHER, { employeeFound: false }, null);
    expect(resolveHrPortalView(ctx)).toBe('employee');
  });

  it('logistics without employee is opsOnly', () => {
    const ctx = buildPortalModeContext(UserRole.LOGISTICS_STAFF, { employeeFound: false }, null);
    expect(resolveHrPortalView(ctx)).toBe('opsOnly');
    expect(showEmployeeSection('opsOnly', false)).toBe(false);
    expect(showEmployeeSection('opsOnly', true)).toBe(true);
  });

  it('logistics with employee is employee not dual', () => {
    const ctx = buildPortalModeContext(UserRole.LOGISTICS_STAFF, { employeeFound: true }, null);
    expect(resolveHrPortalView(ctx)).toBe('employee');
    expect(showCareerSection('employee')).toBe(false);
  });

  it('super admin with employee is employee not dual', () => {
    const ctx = buildPortalModeContext(UserRole.SUPER_ADMIN, { employeeFound: true }, null);
    expect(resolveHrPortalView(ctx)).toBe('employee');
  });

  it('dual shows employee section without employeeFound for loading edge', () => {
    expect(showEmployeeSection('dual', false)).toBe(true);
  });
});
