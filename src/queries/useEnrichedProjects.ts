import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { ENRICHED_PROJECTS }   from '@/queries/keys'
import type { EnrichedProject } from '@/lib/data'

export function useEnrichedProjects() {
  return useQuery<EnrichedProject[], Error>({
    queryKey: ENRICHED_PROJECTS,
    queryFn:  () => dataApi.getEnrichedProjects(),
    initialData: [],
  })
}
