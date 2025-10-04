import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { TRANSFER_LOGS }   from '@/queries/keys'
import type { LogTransferencia } from '@/lib/data'

export function useTransferLogs() {
  return useQuery<LogTransferencia[], Error>({
    queryKey: TRANSFER_LOGS,
    queryFn:  () => dataApi.getTransferLogs(),
    initialData: [],
  })
}
