import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl mb-4">
            🛒
          </div>
          <h1 className="text-xl font-bold mb-2">Supermarché 3D</h1>
          <p className="text-xs text-slate-400 max-w-md mb-6">
            Une interruption temporaire s’est produite. Cliquez ci-dessous pour reprendre vos courses ou la gestion.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-950/50"
          >
            Recharger le supermarché
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
