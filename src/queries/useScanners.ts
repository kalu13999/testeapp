import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { SCANNERS }   from '@/queries/keys'
import type { Scanner } from '@/lib/data'

export function useScanners() {
  return useQuery<Scanner[], Error>({
    queryKey: SCANNERS,
    queryFn:  () => dataApi.getScanners(),
  })
}
