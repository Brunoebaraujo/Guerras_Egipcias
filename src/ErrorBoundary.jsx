import React from "react";
import { reportClientError } from "./telemetry.js";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportClientError("react_boundary", error, { componentStack: info.componentStack });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0c0a09", color: "#e7e5e4", fontFamily: "system-ui, sans-serif" }}>
        <section style={{ maxWidth: 520, textAlign: "center" }}>
          <h1 style={{ color: "#fcd34d" }}>A partida encontrou um erro</h1>
          <p>Seu navegador não precisa ficar numa tela branca. Recarregue para reconectar ou iniciar outra partida.</p>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 16px", border: 0, borderRadius: 8, background: "#d97706", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Recarregar
          </button>
        </section>
      </main>
    );
  }
}
