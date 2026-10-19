import type { ReactNode } from 'react'
import { AccessSection } from './sections/AccessSection'
import { AccountManagementSection } from '../users/components/AccountManagementSection'

export interface SettingsSectionDef {
  /** URL 段:/admin/settings/:section */
  id: string
  labelKey: string
  element: ReactNode
  /** 可选权限门控:缺该 cap 时导航项隐藏、深链接回退到默认分区 */
  capKey?: string
}

/**
 * Settings 分区注册表。
 * 新增分区 = 在此追加一项(左侧导航项与子路由随之生成),无需改动 SettingsLayout 或其他分区代码。
 * 例:{ id: 'notifications', labelKey: 'settings.nav.notifications', element: <NotificationsSection /> }
 */
export const SETTINGS_SECTIONS: SettingsSectionDef[] = [
  { id: 'access', labelKey: 'settings.nav.access', element: <AccessSection /> },
  { id: 'accounts', labelKey: 'settings.nav.accounts', element: <AccountManagementSection />, capKey: 'admin:users.manage' },
]

export const DEFAULT_SECTION_ID = SETTINGS_SECTIONS[0].id
