import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { PROJECT_STORAGES }   from '@/queries/keys'
import type { ProjectStorage } from '@/lib/data'

export function useProjectStorages() {
  return useQuery<ProjectStorage[], Error>({
    queryKey: PROJECT_STORAGES,
    queryFn:  () => dataApi.getProjectStorages(),
    initialData: [],
  })
}
