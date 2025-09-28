import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { AUDIT_LOGS }   from '@/queries/keys'
import type { AuditLog } from '@/lib/data'

export function useAuditLogs() {
  return useQuery<AuditLog[], Error>({
    queryKey: AUDIT_LOGS,
    queryFn:  () => dataApi.getAuditLogs(),
    initialData: [],
  })
}
