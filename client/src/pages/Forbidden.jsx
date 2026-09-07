import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div className="max-w-md mx-auto px-6 py-32 text-center">
      <p className="eyebrow text-stone">403</p>
      <h1 className="font-display text-4xl mt-3 mb-4">Access denied</h1>
      <p className="text-stone mb-8">You don’t have permission to view this page.</p>
      <Link to="/" className="eyebrow link-underline">
        Return home
      </Link>
    </div>
  );
}
