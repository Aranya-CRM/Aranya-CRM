import { http } from '../../../shared/api'
import type { CapsManifest } from '../../../types/capManifest'

export async function getUiManifestV2(): Promise<CapsManifest> {
  const { data } = await http.get<CapsManifest>('/v2/ui/manifest')
  return data
}
