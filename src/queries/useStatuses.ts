import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { STATUSES }   from '@/queries/keys'
import type { DocumentStatus } from '@/lib/data'

export function useStatuses() {
  return useQuery<DocumentStatus[], Error>({
    queryKey: STATUSES,
    queryFn:  () => dataApi.getDocumentStatuses(),
  })
}
