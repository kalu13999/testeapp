import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { PROCESSING_LOGS }   from '@/queries/keys'
import type { ProcessingLog } from '@/lib/data'

export function useProcessingLogs() {
  return useQuery<ProcessingLog[], Error>({
    queryKey: PROCESSING_LOGS,
    queryFn:  () => dataApi.getProcessingLogs(),
    initialData: [],
  })
}
