// src/queries/useClients.ts
import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { CLIENTS }   from '@/queries/keys'
import type { Client } from '@/lib/data'

export function useClients() {
  return useQuery<Client[], Error>({
    queryKey: CLIENTS,
    queryFn:  () => dataApi.getClients(),
    staleTime: 1000 * 60 * 5,
  })
}