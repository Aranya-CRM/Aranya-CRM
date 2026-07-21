import {
  DOCUMENT_CATEGORIES,
  fetchFileAccess,
  saveFileAccess,
  type DocumentCategory,
} from './api/fileAccess.api'

/** 一个可授予选项(某个具体权限项,如"医疗文件")。value 为传给后端的线值。 */
export interface GrantOption {
  value: string
  labelKey: string
  descKey: string
  icon: string
}

/**
 * 某授权族对某用户的当前状态。
 * - granted:可编辑的额外授予,可勾选/取消
 * - locked :用户已具备且本页无法撤销的项(如角色基线),显示为勾选+锁定,保存时不回传
 */
export interface GrantState {
  granted: string[]
  locked: string[]
}

/**
 * 一个可授予权限族 —— 前端授权界面的最小扩展单元。
 * 未来新增一类可授予权限 = 往 GRANT_GROUPS 加一条(选项 + 该族自己的读/写接口),
 * 无需改动分区组件或授权卡片(GrantGroupCard)。
 */
export interface GrantGroup {
  id: string
  titleKey: string
  subtitleKey: string
  options: GrantOption[]
  /** 读取该用户在本族的当前状态(可编辑授予 + 锁定项)。 */
  fetch: (userId: number) => Promise<GrantState>
  /** 用可编辑选择整集合替换,返回持久化后的最新状态。 */
  save: (userId: number, values: string[]) => Promise<GrantState>
}

const DOC_CATEGORY_ICONS: Record<DocumentCategory, string> = {
  ORDINATION: '📜',
  MEDICAL: '🩺',
  FINANCIAL: '💰',
  LEGAL: '⚖',
}

/** 授权族注册表。目前仅"敏感文件类别";新增族在此追加即可。 */
export const GRANT_GROUPS: GrantGroup[] = [
  {
    id: 'file-access',
    titleKey: 'settings.documentAccess.title',
    subtitleKey: 'settings.documentAccess.subtitle',
    options: DOCUMENT_CATEGORIES.map((category) => ({
      value: category,
      labelKey: `settings.documentAccess.category.${category.toLowerCase()}`,
      descKey: `settings.documentAccess.categoryDesc.${category.toLowerCase()}`,
      icon: DOC_CATEGORY_ICONS[category],
    })),
    fetch: async (userId) => {
      const access = await fetchFileAccess(userId)
      return { granted: access.categories, locked: access.inherited }
    },
    save: async (userId, values) => {
      const access = await saveFileAccess(userId, values as DocumentCategory[])
      return { granted: access.categories, locked: access.inherited }
    },
  },
]
