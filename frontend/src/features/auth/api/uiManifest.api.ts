import { http } from '../../../shared/api'
import type { UiManifest } from '../../../types/uiManifest'

export async function getUiManifest(): Promise<UiManifest> {
  const { data } = await http.get<UiManifest>('/v1/ui/manifest')
  return data
}
