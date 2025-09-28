import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { DELIVERY_BATCH_ITEMS }   from '@/queries/keys'
import type { DeliveryBatchItem } from '@/lib/data'

export function useDeliveryBatchItems() {
  return useQuery<DeliveryBatchItem[], Error>({
    queryKey: DELIVERY_BATCH_ITEMS,
    queryFn:  () => dataApi.getDeliveryBatchItems(),
    initialData: [],
  })
}
