import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it } from 'node:test'

const repoRoot = process.cwd()
const sourceRoots = ['frontend/src', 'frontend/tests']
const forbiddenPatterns = [
  'localPendingApprovals',
  'useLocalPendingApprovals',
  'addLocalPendingApproval',
  'removeLocalPendingApproval',
  'mergePendingApprovals',
  'staleLocalApprovalIds',
  'mergePendingCaseApprovals',
  'staleLocalCaseApprovalIds',
  'mergePendingCaseServiceApprovals',
  'staleLocalCaseServiceApprovalIds',
]

describe('approval state source', () => {
  it('keeps pending approval state on the server approvals API only', () => {
    const offenders = sourceRoots.flatMap((root) => sourceFiles(join(repoRoot, root)))
      .filter((file) => !file.endsWith('approvalSingleSource.test.ts'))
      .flatMap((file) => {
        const content = readFileSync(file, 'utf8')
        return forbiddenPatterns
          .filter((pattern) => content.includes(pattern))
          .map((pattern) => `${relative(repoRoot, file)} contains ${pattern}`)
      })

    assert.deepEqual(offenders, [])
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return sourceFiles(fullPath)
    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : []
  })
}
