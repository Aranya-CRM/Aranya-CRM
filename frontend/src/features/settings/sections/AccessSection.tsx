import { useParams } from 'react-router-dom'
import { AccessUserList } from './AccessUserList'
import { AccessUserDetail } from './AccessUserDetail'

/**
 * 访问权限分区 —— 两级结构(参考 GitHub「Collaborators and teams」):
 * - 一级(无 :userId):全部用户列表,仅头像/姓名/账号 + 搜索,不含任何角色或权限信息。
 * - 二级(有 :userId):为该用户配置文件权限(GRANT_GROUPS 驱动)。
 */
export function AccessSection() {
  const { userId } = useParams()
  const parsed = userId ? Number(userId) : Number.NaN

  if (userId && Number.isFinite(parsed)) {
    return <AccessUserDetail userId={parsed} />
  }
  return <AccessUserList />
}
