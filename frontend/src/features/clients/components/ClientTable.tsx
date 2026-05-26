import { useTranslation } from 'react-i18next'
import type { Client } from '../types'
import { EmptyTableRow, SectionCard, TableShell } from '../../../shared/ui'

interface ClientTableProps {
  clients: Client[]
  loading: boolean
  canUpdateClient: boolean
  onView: (clientId: string) => void
  onEdit: (clientId: string) => void
}

export function ClientTable({
  clients,
  loading,
  canUpdateClient,
  onView,
  onEdit,
}: ClientTableProps) {
  const { t } = useTranslation()

  return (
    <SectionCard className="client-list-card">
      <TableShell>
        <table>
          <colgroup>
            <col className="col-abbr" />
            <col className="col-name" />
            <col className="col-tradition" />
            <col className="col-ordination" />
            <col className="col-area" />
            {canUpdateClient ? <col className="col-client-actions" /> : null}
          </colgroup>
          <thead>
            <tr>
              <th>{t('clients.profile.field.abbr')}</th>
              <th>{t('clients.profile.field.nameChn')}</th>
              <th>{t('clients.profile.field.buddhistTradition')}</th>
              <th>{t('clients.profile.field.ordinationStatus')}</th>
              <th>{t('clients.profile.field.areaDistrict')}</th>
              {canUpdateClient ? <th>{t('common.actions')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={canUpdateClient ? 6 : 5} message={t('clients.loading')} />
            ) : clients.length === 0 ? (
              <EmptyTableRow colSpan={canUpdateClient ? 6 : 5} message={t('clients.empty')} />
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className="client-row-clickable"
                  onClick={() => onView(client.id)}
                >
                  <td><span className="cell-zh">{client.abbr}</span></td>
                  <td>
                    <span className="cell-zh">{client.nameChn}</span>
                    <span className="cell-en">{client.nameEn}</span>
                  </td>
                  <td><span className="cell-zh">{client.buddhistTradition}</span></td>
                  <td><span className="cell-zh">{client.ordinationStatus}</span></td>
                  <td><span className="cell-zh">{client.areaDistrict}</span></td>
                  {canUpdateClient ? (
                    <td>
                      <div className="table-action-group">
                        <button
                          className="action-link"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEdit(client.id) }}
                        >
                          {t('clients.profile.editProfile')}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TableShell>
    </SectionCard>
  )
}
