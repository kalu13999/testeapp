import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { ROLES }   from '@/queries/keys'

export function useRoles() {
  return useQuery<string[], Error>({
    queryKey: ROLES,
    queryFn:  () => dataApi.getRoles(),
    initialData: [],
  })
}
