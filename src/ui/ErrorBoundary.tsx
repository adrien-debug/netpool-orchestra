import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#0B1020",
          color: "#fff"
        }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Une erreur s'est produite</h1>
          <p style={{ marginBottom: "2rem", color: "#94a3b8" }}>
            L'application a rencontré une erreur inattendue.
          </p>
          {this.state.error && (
            <pre style={{
              backgroundColor: "#1e293b",
              padding: "1rem",
              borderRadius: "8px",
              maxWidth: "600px",
              overflow: "auto",
              fontSize: "0.875rem",
              textAlign: "left"
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "2rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem"
            }}
          >
            Recharger l'application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
