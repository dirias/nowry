import { useQuery } from '@tanstack/react-query'
import { taskListsService } from '../api/services/taskLists.service'
import { queryClient } from '../api/queryClient'
import { useAuth } from '../context/AuthContext'

const LISTS_STALE_TIME = 60000

/**
 * The learner's task lists (PLAN-021). Every write refreshes the lists, and a
 * delete or an import refreshes the tasks too, because both rewrite their
 * `category`.
 */
export function useTaskLists() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const listsKey = ['taskLists', userId]

  const { data, isLoading, error } = useQuery({
    queryKey: listsKey,
    queryFn: () => taskListsService.getAll(),
    enabled: !!userId,
    staleTime: LISTS_STALE_TIME
  })

  const refreshLists = () => queryClient.invalidateQueries({ queryKey: listsKey })
  const refreshTasks = () => queryClient.invalidateQueries({ queryKey: ['tasks', userId] })

  const create = async (name) => {
    const list = await taskListsService.create(name)
    await refreshLists()
    return list
  }

  const rename = async (id, name) => {
    const list = await taskListsService.rename(id, name)
    await refreshLists()
    return list
  }

  const remove = async (id) => {
    await taskListsService.remove(id)
    await Promise.all([refreshLists(), refreshTasks()])
  }

  const importLegacy = async (lists) => {
    const result = await taskListsService.importLegacy(lists)
    queryClient.setQueryData(listsKey, result)
    await refreshTasks()
    return result
  }

  return { lists: data ?? [], loading: isLoading, error: error ?? null, create, rename, remove, importLegacy }
}

export default useTaskLists
