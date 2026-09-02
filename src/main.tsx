import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { getBasename } from './lib/pb'

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { hasError: boolean }

// 沒有這層保護時，任何一個 render 例外都會讓 React 卸載整棵樹，
// 使用者看到的是一片空白，完全沒有線索。
class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render error was contained by the error boundary.', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
          <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            <h1 className="text-2xl font-semibold">頁面暫時無法顯示</h1>
            <p className="mt-3 text-sm text-muted-foreground">請重新載入頁面後再試一次。</p>
            <button
              type="button"
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              重新載入
            </button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

// 用 pathname 當 key：一次例外之後 hasError 會一直留著，
// 不重設的話換頁也還是那張錯誤卡片。
function RoutedApp() {
  const { pathname } = useLocation()
  return <AppErrorBoundary key={pathname}><App /></AppErrorBoundary>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={getBasename()}><RoutedApp /></BrowserRouter>
  </StrictMode>,
)
