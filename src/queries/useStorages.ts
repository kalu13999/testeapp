import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { STORAGES }   from '@/queries/keys'
import type { Storage } from '@/lib/data'

export function useStorages() {
  return useQuery<Storage[], Error>({
    queryKey: STORAGES,
    queryFn:  () => dataApi.getStorages(),
    initialData: [],
  })
}
