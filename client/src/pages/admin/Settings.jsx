import { useEffect, useState } from 'react';
import client from '../../api/client';
import AdminNav from '../../components/AdminNav';

const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm';
const fmtMnt = (n) => `${(Math.floor(n / 1000) * 1000).toLocaleString('en-US')}₮`;

export default function AdminSettings() {
  const [rate, setRate] = useState('');
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    client
      .get('/settings')
      .then((res) => {
        setCurrent(res.data);
        setRate(res.data.mnt_rate != null ? String(res.data.mnt_rate) : '');
        setError(null);
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await client.patch('/settings', { mnt_rate: Number(rate) });
      setCurrent(res.data);
      setMsg('Saved');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const preview = Number(rate) > 0 ? fmtMnt(1450.9 * Number(rate)) : null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <AdminNav />
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Settings</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="max-w-md">
          <p className="text-sm font-medium text-gray-800">Tögrög exchange rate</p>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            How many ₮ per $1. Shoppers who switch the site to Mongolian see prices converted with
            this rate and rounded down to the nearest thousand tögrög.
          </p>

          <form onSubmit={save} className="flex items-center gap-2">
            <span className="text-sm text-gray-500">$1 =</span>
            <input
              className={`${inputCls} w-32`}
              type="number"
              step="0.01"
              min="0"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              required
            />
            <span className="text-sm text-gray-500">₮</span>
            <button
              className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>

          {preview && (
            <p className="text-xs text-gray-500 mt-3">
              Preview — a $1,450.90 item shows as <span className="text-gray-800">{preview}</span>
            </p>
          )}
          {current?.updated_at && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated {new Date(current.updated_at).toLocaleString()}
            </p>
          )}
          {msg && <p className="text-green-600 text-sm mt-2">{msg}</p>}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
