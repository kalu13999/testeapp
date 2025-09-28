import { useQuery } from '@tanstack/react-query'
import * as dataApi  from '@/lib/data'
import { PROJECT_WORKFLOWS }   from '@/queries/keys'
import type { ProjectWorkflows } from '@/lib/data'

export function useProjectWorkflows() {
  return useQuery<ProjectWorkflows, Error>({
    queryKey: PROJECT_WORKFLOWS,
    queryFn:  () => dataApi.getProjectWorkflows(),
  })
}
