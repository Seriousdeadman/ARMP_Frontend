export function compareFieldValues(a: unknown, b: unknown, asc: boolean): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return asc ? 1 : -1;
  if (b === undefined || b === null) return asc ? -1 : 1;
  if (typeof a === 'number' && typeof b === 'number') {
    return asc ? a - b : b - a;
  }
  const sa = String(a);
  const sb = String(b);
  return asc ? sa.localeCompare(sb) : sb.localeCompare(sa);
}

export function multiSort<T extends object>(
  items: T[],
  levels: { field: keyof T | ''; asc: boolean }[]
): T[] {
  const active = levels.filter(l => l.field !== '' && l.field != null);
  if (!active.length) return items;
  return [...items].sort((x, y) => {
    for (const { field, asc } of active) {
      if (field === '') continue;
      const c = compareFieldValues(x[field], y[field], asc);
      if (c !== 0) return c;
    }
    return 0;
  });
}

export function containsIgnoreCase(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}
