import { PaginationQueryDto, PaginatedResult } from '../dto/pagination-query.dto';

export function paginateCollection<T>(items: T[]): T[];
export function paginateCollection<T>(items: T[], query: PaginationQueryDto | undefined, searchFields?: (keyof T)[]): any;
export function paginateCollection<T>(
  items: T[],
  query?: PaginationQueryDto,
  searchFields?: (keyof T)[],
): any {
  if (!items || !Array.isArray(items)) {
    return query && (query.page !== undefined || query.limit !== undefined)
      ? { data: [], total: 0, page: 1, limit: 10, totalPages: 0 }
      : [];
  }

  let result = [...items];

  // 1. Search Filter
  if (query?.search && query.search.trim()) {
    const q = query.search.trim().toLowerCase();
    result = result.filter((item) => {
      if (!item) return false;
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      }
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }

  // 2. Sorting
  if (query?.sortBy) {
    const sortKey = query.sortBy as keyof T;
    const isDesc = (query.sortOrder || 'asc').toLowerCase() === 'desc';

    result.sort((a, b) => {
      const valA = a ? a[sortKey] : undefined;
      const valB = b ? b[sortKey] : undefined;

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return isDesc ? valB - valA : valA - valB;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const comp = strA.localeCompare(strB);
      return isDesc ? -comp : comp;
    });
  }

  // 3. Check if paginated response is requested
  const hasPage = query?.page !== undefined;
  const hasLimit = query?.limit !== undefined;

  if (!hasPage && !hasLimit) {
    return result;
  }

  const limit = Math.max(1, query?.limit || 10);
  const page = Math.max(1, query?.page || (query?.offset !== undefined ? Math.floor(query.offset / limit) + 1 : 1));
  const offset = query?.offset !== undefined ? query.offset : (page - 1) * limit;

  const total = result.length;
  const totalPages = Math.ceil(total / limit);
  const paginatedData = result.slice(offset, offset + limit);

  return {
    data: paginatedData,
    total,
    page,
    limit,
    totalPages,
  };
}
