import { Component } from 'react';

// Class component — the only way to catch render errors in React. Keeps the
// chrome (nav/footer) intact and offers a reload instead of a white screen.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error boundary caught:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-lg mx-auto px-6 py-32 md:py-40 text-center">
          <p className="font-display text-6xl text-mist leading-none">—</p>
          <h1 className="font-display text-2xl md:text-3xl mt-5">Something went wrong</h1>
          <p className="text-stone text-sm mt-3 max-w-sm mx-auto">
            This page hit an unexpected error. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 eyebrow link-underline"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
