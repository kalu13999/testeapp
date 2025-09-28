import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { RAW_PROJECTS }   from '@/queries/keys'
import type { Project } from '@/lib/data'

export function useRawProjects() {
  return useQuery<Project[], Error>({
    queryKey: RAW_PROJECTS,
    queryFn:  () => dataApi.getRawProjects(),
  })
}
