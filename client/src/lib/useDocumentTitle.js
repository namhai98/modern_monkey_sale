import { useEffect } from 'react';

const SUFFIX = 'Modern Monkey';
const DEFAULT = 'Modern Monkey — Maison';

// Set the document title for a route. Pass a falsy value to keep the default.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — ${SUFFIX}` : DEFAULT;
    return () => {
      document.title = DEFAULT;
    };
  }, [title]);
}
