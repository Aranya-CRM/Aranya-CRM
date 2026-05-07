import { readFile } from 'node:fs/promises'
import { createSign } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_SERVICE_ACCOUNT_PATH = 'backend/src/main/resources/firebase-service-account-dev.json'
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const serviceAccountPath = resolve(
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? resolve(repoRoot, DEFAULT_SERVICE_ACCOUNT_PATH),
)
const projectIdOverride = process.env.FIREBASE_PROJECT_ID
const adjacentIntervals = Number.parseInt(process.env.FIREBASE_TOTP_ADJACENT_INTERVALS ?? '5', 10)

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

async function fetchJson(url, options) {
  const response = await fetch(url, options)
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`)
  }

  return body
}

async function createAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const unsignedJwt = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsignedJwt)
  signer.end()

  const signature = signer
    .sign(serviceAccount.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const assertion = `${unsignedJwt}.${signature}`

  const token = await fetchJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  return token.access_token
}

async function main() {
  if (!Number.isInteger(adjacentIntervals) || adjacentIntervals < 0 || adjacentIntervals > 10) {
    throw new Error('FIREBASE_TOTP_ADJACENT_INTERVALS must be an integer from 0 to 10.')
  }

  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'))
  const projectId = projectIdOverride ?? serviceAccount.project_id

  if (!projectId) {
    throw new Error('Firebase project id was not found. Set FIREBASE_PROJECT_ID or check the service account file.')
  }

  const accessToken = await createAccessToken(serviceAccount)
  const result = await fetchJson(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=mfa`,
    {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'x-goog-user-project': projectId,
      },
      body: JSON.stringify({
        mfa: {
          providerConfigs: [
            {
              state: 'ENABLED',
              totpProviderConfig: {
                adjacentIntervals,
              },
            },
          ],
        },
      }),
    },
  )

  console.log(`TOTP MFA enabled for Firebase project ${projectId}.`)
  console.log(JSON.stringify(result.mfa ?? result, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
