import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { ENRICHED_AUDIT_LOGS }   from '@/queries/keys'
import type { EnrichedAuditLog } from '@/lib/data'

export function useEnrichedAuditLogs() {
  return useQuery<EnrichedAuditLog[], Error>({
    queryKey: ENRICHED_AUDIT_LOGS,
    queryFn:  () => dataApi.getAuditLogs(),
    initialData: [],
  })
}
