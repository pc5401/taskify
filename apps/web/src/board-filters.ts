import type { CardFilters } from './browser-api';

/** Preserve scalar strings; validate the raw limit before converting it. */
export function parseBoardFilters(query: URLSearchParams): CardFilters | null {
  const filters: CardFilters = {};
  for (const name of ['columnId', 'assigneeId', 'tag', 'limit'] as const) {
    if (query.getAll(name).length > 1) return null;
    const value = query.get(name);
    if (value === null) continue;
    if (name === 'limit') {
      if (!/^\d+$/.test(value) || !Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 100) return null;
      filters.limit = Number(value);
    } else filters[name] = value;
  }
  return filters;
}
