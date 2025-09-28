import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { REJECTION_TAGS }   from '@/queries/keys'
import type { RejectionTag } from '@/lib/data'

export function useRejectionTags() {
  return useQuery<RejectionTag[], Error>({
    queryKey: REJECTION_TAGS,
    queryFn:  () => dataApi.getRejectionTags(),
    initialData: [],
  })
}
