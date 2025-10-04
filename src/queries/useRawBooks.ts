import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { RAW_BOOKS }   from '@/queries/keys'
import type { RawBook } from '@/lib/data'

export function useRawBooks() {
  return useQuery<RawBook[], Error>({
    queryKey: RAW_BOOKS,
    queryFn:  () => dataApi.getRawBooks(),
    initialData: [],
  })
}
