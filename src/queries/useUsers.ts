import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { USERS }   from '@/queries/keys'
import type { User } from '@/lib/data'

export function useUsers() {
  return useQuery<User[], Error>({
    queryKey: USERS,
    queryFn:  () => dataApi.getUsers(),
    initialData: [],
  })
}
