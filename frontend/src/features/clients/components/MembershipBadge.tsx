import type { Client } from '../../../types/client'

interface MembershipBadgeProps {
  status: Client['membershipStatus']
}

export function MembershipBadge({ status }: MembershipBadgeProps) {
  const cls = 'membership-' + status.toLowerCase()
  return <span className={'membership-badge ' + cls}>{status}</span>
}
