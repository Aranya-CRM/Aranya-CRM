import type { CaseColorCode } from '../types'

export function CaseIntensityDot({ colorCode }: { colorCode: CaseColorCode }) {
  return <span className={`case-intensity-dot case-intensity-${colorCode.toLowerCase()}`} aria-hidden="true" />
}
