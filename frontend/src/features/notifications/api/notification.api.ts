import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../../shared/api'

export interface EventNotification {
  id: number
  eventId: number
  deadline: string
  createdAt: string
  readAt?: string | null
}

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  active: () => [...notificationQueryKeys.all, 'active'] as const,
}

export async function fetchNotifications(): Promise<EventNotification[]> {
  const response = await http.get<EventNotification[]>('/v1/notifications')
  return response.data
}

export async function markNotificationRead(id: number): Promise<EventNotification> {
  const response = await http.patch<EventNotification>(`/v1/notifications/${id}/read`)
  return response.data
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.patch('/v1/notifications/read-all')
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationQueryKeys.active(),
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (updated) => {
      queryClient.setQueryData<EventNotification[]>(
        notificationQueryKeys.active(),
        (current = []) => current.map((item) => item.id === updated.id ? updated : item),
      )
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      const readAt = new Date().toISOString()
      queryClient.setQueryData<EventNotification[]>(
        notificationQueryKeys.active(),
        (current = []) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      )
    },
  })
}
