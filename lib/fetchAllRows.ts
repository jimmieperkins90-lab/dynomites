// Supabase's project-level "Max Rows" setting silently truncates unpaginated
// queries with no error -- just fewer rows than expected. Use this for any
// query touching a table that could grow large and isn't already scoped to
// one small slice (one season, one manager, etc.).
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
