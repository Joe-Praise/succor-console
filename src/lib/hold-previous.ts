/**
 * For useQuery's placeholderData: while a new range or filter loads, keep showing the previous
 * result so a chart can morph instead of flashing a skeleton. It never crosses projects, so one
 * tenant's numbers can't appear under another's name, even for a moment.
 */
export function holdWithinProject(projectId: string) {
  return <T,>(previous: T | undefined, query: { queryKey: readonly unknown[] } | undefined): T | undefined =>
    query?.queryKey[1] === projectId ? previous : undefined;
}
