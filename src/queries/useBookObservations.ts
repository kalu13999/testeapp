import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { BOOK_OBSERVATIONS }   from '@/queries/keys'
import type { BookObservation } from '@/lib/data'

export function useBookObservations() {
  return useQuery<BookObservation[], Error>({
    queryKey: BOOK_OBSERVATIONS,
    queryFn:  () => dataApi.getBookObservations(),
  })
}
