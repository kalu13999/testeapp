import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { RAW_DOCUMENTS }   from '@/queries/keys'
import type { Document as RawDocument } from '@/lib/data'

export function useRawDocuments() {
  return useQuery<RawDocument[], Error>({
    queryKey: RAW_DOCUMENTS,
    queryFn:  () => dataApi.getRawDocuments(),
    initialData: [],
  })
}
