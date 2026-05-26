import { useTranslation } from 'react-i18next'
import { EmptyState, PageHeader } from '../../../shared/ui'

export function CaseFormPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('cases.form.newCase')} />
      <EmptyState message="Coming soon..." />
    </>
  )
}
