import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { DELIVERY_BATCHES }   from '@/queries/keys'
import type { DeliveryBatch } from '@/lib/data'

export function useDeliveryBatches() {
  return useQuery<DeliveryBatch[], Error>({
    queryKey: DELIVERY_BATCHES,
    queryFn:  () => dataApi.getDeliveryBatches(),
  })
}
