'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  allowRetry?: boolean
  showDetails?: boolean
  context?: string // Additional context for error reporting
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3
  
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    
    // Set full error info
    this.setState({ errorInfo })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Report critical errors for production debugging
    this.reportError(error, errorInfo)

    // Show non-blocking toast notification
    toast.error(`Component error: ${error.message}`, {
      description: 'The component has been isolated to prevent further issues.',
      duration: 5000,
    })
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In production, you might want to send this to a logging service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        context: this.props.context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      }
      
      console.error('[ErrorBoundary] Error Report:', errorReport)
      
      // Store in localStorage for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        const existingReports = JSON.parse(localStorage.getItem('errorReports') || '[]')
        existingReports.push(errorReport)
        // Keep only last 10 reports
        const recentReports = existingReports.slice(-10)
        localStorage.setItem('errorReports', JSON.stringify(recentReports))
      }
    } catch (reportingError) {
      console.error('[ErrorBoundary] Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
      
      toast.success('Retrying component...', {
        description: `Attempt ${this.state.retryCount + 1} of ${this.maxRetries}`,
      })
    } else {
      toast.error('Maximum retry attempts reached', {
        description: 'Please refresh the page or contact support.',
      })
    }
  }

  private handleRefreshPage = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    const errorMessage = error.message.toLowerCase()
    const errorStack = error.stack?.toLowerCase() || ''

    // Critical errors
    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return 'critical'
    }

    // High severity
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
        errorMessage.includes('permission') || errorMessage.includes('auth')) {
      return 'high'
    }

    // Medium severity  
    if (errorMessage.includes('validation') || errorMessage.includes('parse') ||
        errorStack.includes('react-query') || errorStack.includes('trpc')) {
      return 'medium'
    }

    return 'low'
  }

  private getRecoveryActions = (error: Error) => {
    const severity = this.getErrorSeverity(error)
    const errorMessage = error.message.toLowerCase()

    const actions = []

    // Always allow retry for non-critical errors if allowed
    if (this.props.allowRetry !== false && severity !== 'critical' && this.state.retryCount < this.maxRetries) {
      actions.push({
        label: `Retry (${this.maxRetries - this.state.retryCount} attempts left)`,
        icon: RefreshCw,
        onClick: this.handleRetry,
        variant: 'default' as const
      })
    }

    // Network/loading errors need page refresh
    if (errorMessage.includes('chunk') || errorMessage.includes('loading') || 
        errorMessage.includes('network')) {
      actions.push({
        label: 'Refresh Page',
        icon: RefreshCw,
        onClick: this.handleRefreshPage,
        variant: 'outline' as const
      })
    }

    // Always provide way to go home
    actions.push({
      label: 'Go to Home',
      icon: Home,
      onClick: this.handleGoHome,
      variant: 'outline' as const
    })

    return actions
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const error = this.state.error!
      const severity = this.getErrorSeverity(error)
      const recoveryActions = this.getRecoveryActions(error)

      // Critical errors get a more prominent display
      const alertVariant = severity === 'critical' ? 'destructive' : 'default'

      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Alert variant={alertVariant} className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              Component Error
              {severity === 'critical' && (
                <span className="px-2 py-1 text-xs bg-red-600 text-white rounded">
                  CRITICAL
                </span>
              )}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">
                {error.message || 'An unexpected error occurred in this component.'}
              </p>
              
              {this.props.context && (
                <p className="text-sm text-muted-foreground mb-3">
                  Context: {this.props.context}
                </p>
              )}

              {severity === 'critical' && (
                <p className="text-sm font-medium mb-3 text-red-700 dark:text-red-400">
                  This is a critical error that may require a page refresh or returning to the home page.
                </p>
              )}

              {this.state.retryCount > 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                  Retry attempts: {this.state.retryCount} of {this.maxRetries}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {recoveryActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <Button
                      key={index}
                      variant={action.variant}
                      size="sm"
                      onClick={action.onClick}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {action.label}
                    </Button>
                  )
                })}
              </div>

              {this.props.showDetails && this.state.errorInfo && (
                <details className="mt-4 p-3 bg-muted rounded-md">
                  <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Technical Details
                  </summary>
                  <div className="mt-2 text-xs font-mono text-muted-foreground">
                    <div className="mb-2">
                      <strong>Error:</strong> {error.name}: {error.message}
                    </div>
                    {error.stack && (
                      <div className="mb-2">
                        <strong>Stack trace:</strong>
                        <pre className="whitespace-pre-wrap break-all mt-1">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo.componentStack && (
                      <div>
                        <strong>Component stack:</strong>
                        <pre className="whitespace-pre-wrap break-all mt-1">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}
