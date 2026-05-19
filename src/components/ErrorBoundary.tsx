import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="page-shell loading-shell">
          <div className="empty-state">
            <h1>Something went wrong</h1>
            <p>{this.state.error?.message ?? "An unexpected error occurred loading this page."}</p>
            <button type="button" onClick={this.handleReset}>
              Try again
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
