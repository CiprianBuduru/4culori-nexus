import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('dynamically imported module') ||
                           this.state.error?.message?.includes('Failed to fetch');
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-xl font-bold text-red-600 mb-4">
              {isChunkError ? 'Eroare la încărcare' : 'Eroare în aplicație'}
            </h1>
            <p className="text-gray-700 mb-4">
              {isChunkError 
                ? 'Nu s-a putut încărca pagina. Verifică conexiunea la internet și încearcă din nou.'
                : 'A apărut o eroare neașteptată. Vă rugăm să reîncărcați pagina.'}
            </p>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40 mb-4">
              {this.state.error?.message}
            </pre>
            <div className="flex gap-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                onClick={this.handleRetry}
              >
                <RefreshCw className="h-4 w-4" />
                Încearcă din nou
              </button>
              <button
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300"
                onClick={() => window.location.reload()}
              >
                Reîncarcă pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}