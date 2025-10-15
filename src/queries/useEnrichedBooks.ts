import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { ENRICHED_BOOKS }   from '@/queries/keys'
import type { EnrichedBook } from '@/lib/data'

export function useEnrichedBooks() {
  return useQuery<EnrichedBook[], Error>({
    queryKey: ENRICHED_BOOKS,
    queryFn:  () => dataApi.getEnrichedBooks(),
    initialData: [],
  })
}
