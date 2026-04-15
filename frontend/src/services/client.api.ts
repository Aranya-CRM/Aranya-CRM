import { clientMockData } from '../mocks/client.mock'
import type { Client } from '../types/client'
import { http } from './http'

function getDataMode(): 'mock' | 'api' | 'auto' {
  const mode = (import.meta.env.VITE_DATA_MODE ?? 'auto').toLowerCase()
  if (mode === 'mock' || mode === 'api') return mode
  return 'auto'
}

export async function fetchClients(): Promise<Client[]> {
  const mode = getDataMode()
  if (mode === 'mock') return clientMockData

  try {
    const res = await http.get<Client[]>('/v1/clients')
    return res.data
  } catch {
    if (mode === 'auto') return clientMockData
    throw new Error('Failed to fetch clients')
  }
}

export async function fetchClientById(id: string): Promise<Client | undefined> {
  const mode = getDataMode()
  if (mode === 'mock') return clientMockData.find((c) => c.id === id)

  try {
    const res = await http.get<Client>(`/v1/clients/${id}`)
    return res.data
  } catch {
    if (mode === 'auto') return clientMockData.find((c) => c.id === id)
    throw new Error('Failed to fetch client')
  }
}

export async function createClient(data: Omit<Client, 'id'>): Promise<Client> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const newClient = { ...data, id: `client-${Date.now()}` } as Client
    clientMockData.push(newClient)
    return newClient
  }

  try {
    const res = await http.post<Client>('/v1/clients', data)
    return res.data
  } catch {
    if (mode === 'auto') {
      const newClient = { ...data, id: `client-${Date.now()}` } as Client
      clientMockData.push(newClient)
      return newClient
    }
    throw new Error('Failed to create client')
  }
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  const mode = getDataMode()
  if (mode === 'mock') {
    const idx = clientMockData.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Client not found')
    const updated = { ...clientMockData[idx], ...data }
    clientMockData[idx] = updated
    return updated
  }

  try {
    const res = await http.put<Client>(`/v1/clients/${id}`, data)
    return res.data
  } catch {
    if (mode === 'auto') {
      const idx = clientMockData.findIndex((c) => c.id === id)
      if (idx === -1) throw new Error('Client not found')
      const updated = { ...clientMockData[idx], ...data }
      clientMockData[idx] = updated
      return updated
    }
    throw new Error('Failed to update client')
  }
}
