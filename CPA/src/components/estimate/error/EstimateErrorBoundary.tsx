'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class EstimateErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error('EstimateErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Here you could send to error reporting service like Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReportBug = () => {
    const error = this.state.error;
    const subject = encodeURIComponent('Estimate Component Error Report');
    const body = encodeURIComponent(`
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
UserAgent: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
[Your description here]
    `);
    
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails } = this.state;

      return (
        <Card className="max-w-2xl mx-auto my-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Something went wrong with the estimate</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription>
                An unexpected error occurred while loading or processing the estimate data. 
                This has been logged and our team will investigate.
              </AlertDescription>
            </Alert>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-800 font-medium mb-2">
                  Error Details:
                </div>
                <div className="text-sm text-red-700 font-mono bg-red-100 p-2 rounded">
                  {error.message}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={this.handleRetry} className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
              
              <Button onClick={this.handleReload} variant="outline">
                Reload Page
              </Button>
              
              <Button onClick={this.handleReportBug} variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
              
              <Button 
                onClick={this.toggleDetails} 
                variant="ghost" 
                size="sm"
                className="flex items-center space-x-1"
              >
                {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>{showDetails ? 'Hide' : 'Show'} Technical Details</span>
              </Button>
            </div>

            {showDetails && (errorInfo || error) && (
              <div className="mt-4 space-y-3">
                <div className="text-sm font-medium text-gray-700">
                  Technical Information (for debugging):
                </div>
                
                {error?.stack && (
                  <div className="bg-gray-100 border rounded p-3">
                    <div className="text-xs font-medium text-gray-600 mb-2">Stack Trace:</div>
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
                
                {errorInfo?.componentStack && (
                  <div className="bg-gray-100 border rounded p-3">
                    <div className="text-xs font-medium text-gray-600 mb-2">Component Stack:</div>
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 border-t pt-3">
              <p>
                If this error persists, please contact support with the error details above.
                Your work should be automatically saved and you can try refreshing the page.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}