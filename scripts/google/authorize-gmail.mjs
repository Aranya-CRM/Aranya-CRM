#!/usr/bin/env node

import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'

const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? 'aranya-crm-dev'
const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  ?? '746649380908-esbcfbu0egckeuucfng3n0tococv5s4b.apps.googleusercontent.com'
const port = Number(process.env.GOOGLE_OAUTH_LOCAL_PORT ?? '53682')
const loginHint = process.env.GOOGLE_OAUTH_LOGIN_HINT ?? 'infotech@aranya.sg'
const redirectUri = `http://127.0.0.1:${port}/oauth2/callback`
const state = randomBytes(24).toString('hex')
const scopes = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.send',
]

function gcloud(args, options = {}) {
  const command = process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud'
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `gcloud exited with ${result.status}`)
  }
  return result.stdout.trim()
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Process', url], {
      detached: true,
      stdio: 'ignore',
    }).unref()
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
  } else {
    spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
  }
}

function waitForCode() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close()
      reject(new Error('OAuth callback timed out after 10 minutes'))
    }, 10 * 60 * 1000)
    const server = createServer((request, response) => {
      const url = new URL(request.url, redirectUri)
      if (url.pathname !== '/oauth2/callback') {
        response.writeHead(404).end()
        return
      }
      if (url.searchParams.get('state') !== state) {
        response.writeHead(400).end('Invalid OAuth state.')
        clearTimeout(timeout)
        server.close()
        reject(new Error('OAuth state mismatch'))
        return
      }
      const error = url.searchParams.get('error')
      const code = url.searchParams.get('code')
      if (error || !code) {
        response.writeHead(400).end('Authorization was not completed.')
        clearTimeout(timeout)
        server.close()
        reject(new Error(error ?? 'No authorization code returned'))
        return
      }
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Authorization complete. You can close this tab and return to Codex.')
      clearTimeout(timeout)
      server.close()
      resolve(code)
    })
    server.listen(port, '127.0.0.1')
  })
}

async function main() {
  const clientSecret = gcloud([
    'secrets', 'versions', 'access', 'latest',
    '--secret=gcal-oauth-client-secret',
    `--project=${projectId}`,
  ])
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    login_hint: loginHint,
    state,
  }).toString()

  console.log(`Waiting for Google OAuth callback on ${redirectUri}`)
  console.log(`If the browser does not open automatically, visit:\n${authorizationUrl}`)
  const codePromise = waitForCode()
  openBrowser(authorizationUrl.toString())
  const code = await codePromise

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenResponse.json()
  if (!tokenResponse.ok || !tokens.refresh_token) {
    throw new Error(tokens.error_description ?? tokens.error ?? 'No refresh token returned')
  }

  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = await profileResponse.json()
  if (!profileResponse.ok || !profile.email) {
    throw new Error(profile.error_description ?? profile.error ?? 'Unable to read authorized Google profile')
  }

  gcloud([
    'secrets', 'versions', 'add', 'gcal-oauth-refresh-token',
    '--data-file=-',
    `--project=${projectId}`,
  ], { input: tokens.refresh_token })

  console.log('OAuth authorization succeeded.')
  console.log(`Authorized Gmail sender: ${profile.email}`)
  console.log('The combined Calendar + Gmail refresh token is stored in Secret Manager.')
}

main().catch((error) => {
  console.error(`Authorization failed: ${error.message}`)
  process.exitCode = 1
})
