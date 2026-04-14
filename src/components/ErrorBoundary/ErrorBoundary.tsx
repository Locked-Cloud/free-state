import React, { Component, ErrorInfo, ReactNode } from "react";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>⚠️</span>
            </div>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.message}>
              An unexpected error occurred. Please try again or refresh the page.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className={styles.details}>
                <summary>Error Details</summary>
                <pre className={styles.errorText}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className={styles.actions}>
              <button onClick={this.handleRetry} className={styles.retryButton}>
                Try Again
              </button>
              <button onClick={this.handleReload} className={styles.reloadButton}>
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
