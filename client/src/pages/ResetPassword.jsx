import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await client.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-sm mx-auto px-6 py-8">
        <p className="text-gray-700">This reset link is missing its token.</p>
        <Link to="/forgot-password" className="text-sm text-gray-900 underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Set a new password</h1>

      {done ? (
        <p className="text-gray-700">
          Password updated. Taking you to the login page&hellip;
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gray-900 text-white px-5 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Reset password'}
          </button>
        </form>
      )}
    </div>
  );
}
