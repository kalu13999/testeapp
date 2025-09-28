import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { PROCESSING_BATCHES }   from '@/queries/keys'
import type { ProcessingBatch } from '@/lib/data'

export function useProcessingBatches() {
  return useQuery<ProcessingBatch[], Error>({
    queryKey: PROCESSING_BATCHES,
    queryFn:  () => dataApi.getProcessingBatches(),
    initialData: [],
  })
}
