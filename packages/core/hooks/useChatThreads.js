import { useQuery } from '@tanstack/react-query'
import { agentService } from '../api/services/agent.service'

/**
 * The threads General can pick up again, newest first (CHAT-010). Read only
 * when asked for — General, with nothing on screen — and kept for a minute.
 * A free account keeps no threads and gets an empty list.
 *
 * @param {boolean} enabled
 * @returns {Array<{subject: string, title: string, last_at: string|null}>}
 */
export function useChatThreads(enabled) {
  const { data } = useQuery({
    queryKey: ['agentThreads'],
    queryFn: () => agentService.getThreads(),
    enabled: Boolean(enabled),
    staleTime: 60 * 1000
  })
  return data?.threads ?? []
}

export default useChatThreads
