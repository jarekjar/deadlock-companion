import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isNative } from './native'

/**
 * Session comes from the Pages Function /api/auth/me (signed cookie).
 * Under plain `vite dev` there are no functions — the 404 reads as signed out.
 * The native app has no Steam sign-in at all, so it never asks.
 */
export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async (): Promise<number | null> => {
      if (isNative) return null
      const res = await fetch('/api/auth/me')
      if (!res.ok) return null
      const body = (await res.json()) as { accountId: number }
      return body.accountId
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
    },
    onSuccess: () => queryClient.setQueryData(['session'], null),
  })
}
