import { useQuery } from '@tanstack/react-query'
import { fetchUsers } from '../api/userManagement.api'

export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: () => [...userQueryKeys.lists()] as const,
}

/** 只读用户列表(派工/审批指派下拉)。账号管理的增删改见 features/admin。 */
export function useUsers() {
  return useQuery({
    queryKey: userQueryKeys.list(),
    queryFn: fetchUsers,
  })
}
