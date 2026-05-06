import { EmptyState, PageHeader } from '../../shared/ui'

export function UsersPlaceholderPage() {
  return (
    <>
      <PageHeader
        titleZh="用户管理"
        titleEn="User Management"
        descriptionZh="用户管理页面将在后续步骤实现。"
        descriptionEn="This page will be implemented in a later step."
      />
      <EmptyState message="Coming soon..." />
    </>
  )
}
