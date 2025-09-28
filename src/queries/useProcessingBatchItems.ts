import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { PROCESSING_BATCH_ITEMS }   from '@/queries/keys'
import type { ProcessingBatchItem } from '@/lib/data'

export function useProcessingBatchItems() {
  return useQuery<ProcessingBatchItem[], Error>({
    queryKey: PROCESSING_BATCH_ITEMS,
    queryFn:  () => dataApi.getProcessingBatchItems(),
    initialData: [],
  })
}
