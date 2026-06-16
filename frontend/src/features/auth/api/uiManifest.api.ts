import { http } from '../../../shared/api'
import type { CapsManifest } from '../../../types/capManifest'

export async function getUiManifest(): Promise<CapsManifest> {
  const { data } = await http.get<CapsManifest>('/ui/manifest')
  return data
}
