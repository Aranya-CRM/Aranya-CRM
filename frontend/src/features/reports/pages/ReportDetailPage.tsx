import { Navigate, useParams } from 'react-router-dom'

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={id ? `/reports?selected=${id}` : '/reports'} replace />
}
