import { Component } from 'react';

// Class component — the only way to catch render errors in React. Keeps the
// chrome (nav/footer) intact and offers a reload instead of a white screen.
//
// Deliberately not wired to useLocale(): a class component can't read a hook,
// and reaching for the dictionary inside an error path risks throwing a second
// time. Instead it carries its own two-language copy and reads the saved
// language straight from storage (the same key LocaleContext writes), falling
// back to Mongolian — the site's default — if storage is unavailable.
const COPY = {
  mn: {
    eyebrow: 'Алдаа',
    before: 'Уучлаарай, ',
    accent: 'алдаа гарлаа',
    after: '',
    body: 'Энэ хуудсанд гэнэтийн алдаа гарлаа. Дахин ачаалахад ихэвчлэн засагддаг.',
    reload: 'Дахин ачаалах',
  },
  en: {
    eyebrow: 'Error',
    before: 'Something went ',
    accent: 'wrong',
    after: '',
    body: 'This page hit an unexpected error. Reloading usually clears it.',
    reload: 'Reload',
  },
};

function savedLocale() {
  try {
    return localStorage.getItem('mms_lang') === 'en' ? 'en' : 'mn';
  } catch {
    return 'mn';
  }
}

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
      const c = COPY[savedLocale()];
      // The same fixed-dark, centred skeleton every other full-page state uses.
      // Written out rather than importing EmptyState so this file has no
      // dependency that could itself be the thing that failed.
      return (
        /* No negative top margin here, unlike PageHero/EmptyState: this can
           render on the home route too, where <main> has no header clearance to
           cancel, and pulling up would tuck the headline under the header. */
        <section className="flex min-h-[calc(100svh-var(--header-h))] items-center bg-ink text-center text-white">
          <div className="container-lux py-20">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1 className="heading-serif mt-5 text-4xl leading-[1.05] md:text-6xl">
              {c.before}
              <span className="text-gold">{c.accent}</span>
              {c.after}
            </h1>
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/60 md:text-base">
              {c.body}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="micro mt-10 border border-white/40 px-9 py-4 font-medium tracking-button transition-colors duration-500 hover:border-gold hover:text-gold"
            >
              {c.reload}
            </button>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
