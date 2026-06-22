import { type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { AuthProvider } from '../contexts/AuthContext'
import { queryClient } from './queryClient'

interface AppProvidersProps {
  children: ReactNode
}

// 品牌主题:与 shared/styles/tokens.css 保持一致(Teal 品牌色)
const antdThemeConfig = {
  token: {
    colorPrimary: '#1d9e75', // Teal 400
    colorInfo: '#185fa5', // Blue 600
    colorSuccess: '#3b6d11', // Green 600
    colorWarning: '#854f0b', // Amber 600
    colorError: '#a32d2d', // Red 600
    colorLink: '#0c447c', // Blue 800
    borderRadius: 6,
  },
  algorithm: antdTheme.defaultAlgorithm,
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={antdThemeConfig}>
          <BrowserRouter>
            {children}
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}
