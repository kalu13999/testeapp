import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { PERMISSIONS }   from '@/queries/keys'
import type { Permissions } from '@/lib/data'

export function usePermissions() {
  return useQuery<Permissions, Error>({
    queryKey: PERMISSIONS,
    queryFn:  () => dataApi.getPermissions(),
    initialData: {},
  })
}
