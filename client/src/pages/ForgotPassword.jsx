import { useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await client.post('/auth/forgot-password', { email });
    } catch {
      // The endpoint always succeeds; ignore transport errors for the same UX.
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Reset password</h1>

      {sent ? (
        <div className="space-y-4">
          <p className="text-gray-700">
            If an account exists for <span className="font-medium">{email}</span>, a reset link is on
            its way. The link is valid for 30 minutes.
          </p>
          <Link to="/login" className="text-sm text-gray-900 underline">
            Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your email and we'll send you a link to set a new password.
          </p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 text-white px-5 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
          <Link to="/login" className="block text-sm text-gray-600 hover:underline">
            Back to log in
          </Link>
        </form>
      )}
    </div>
  );
}
