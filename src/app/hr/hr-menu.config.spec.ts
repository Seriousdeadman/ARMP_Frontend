import { UserRole } from '../models/user.models';
import { filterHrMenu } from './hr-menu.config';

describe('filterHrMenu', () => {
  it('returns student application links', () => {
    const g = filterHrMenu(UserRole.STUDENT);
    expect(g.length).toBe(1);
    expect(g[0].links.some(l => l.route === '/app/hr')).toBe(true);
    expect(g[0].links.some(l => l.route === '/app/careers')).toBe(true);
  });

  it('returns teacher portal and profile', () => {
    const g = filterHrMenu(UserRole.TEACHER);
    const flat = g.flatMap(x => x.links);
    expect(flat.some(l => l.route === '/app/hr')).toBe(true);
    expect(flat.some(l => l.route === '/app/profile')).toBe(true);
  });

  it('returns recruitment and people for logistics without governance', () => {
    const g = filterHrMenu(UserRole.LOGISTICS_STAFF);
    const labels = g.map(x => x.id);
    expect(labels).toContain('recruitment');
    expect(labels).toContain('people');
    expect(labels).not.toContain('governance');
  });

  it('adds governance for super admin', () => {
    const g = filterHrMenu(UserRole.SUPER_ADMIN);
    expect(g.some(x => x.id === 'governance')).toBe(true);
  });

  it('adds My HR column for student when employee linked', () => {
    const g = filterHrMenu(UserRole.STUDENT, { employeeFound: true, candidateFound: true });
    expect(g.some(x => x.label === 'My HR & Leave')).toBe(true);
    expect(g.some(x => x.label === 'My Career')).toBe(true);
  });
});
