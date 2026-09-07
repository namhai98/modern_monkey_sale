import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const inputCls =
  'w-full bg-transparent border-b border-line py-3 text-sm placeholder:text-stone focus:outline-none focus:border-ink transition-colors';
const btnCls =
  'h-11 px-8 bg-ink text-canvas eyebrow border border-ink hover:bg-canvas hover:text-ink transition-colors duration-500 disabled:opacity-40';

export default function Profile() {
  const { user, updateUser, logoutEverywhere } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    try {
      const { data } = await client.put('/users/me', { name });
      updateUser({ ...user, ...data.user });
      setNameMsg({ ok: true, text: 'Saved' });
    } catch (err) {
      setNameMsg({ ok: false, text: err.response?.data?.error || 'Failed to save' });
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setSavingPw(true);
    setPwMsg(null);
    try {
      await client.put('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPwMsg({ ok: true, text: 'Password changed' });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.error || 'Failed to change password' });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20 space-y-14">
      <div>
        <p className="eyebrow text-stone">Account</p>
        <h1 className="font-display text-4xl mt-3 mb-1">Profile</h1>
        <p className="text-sm text-stone mb-8">
          {user.email} · <span className="capitalize">{user.role}</span>
        </p>
        <form onSubmit={saveName} className="space-y-4">
          <label className="eyebrow text-stone block">Name</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {nameMsg && (
            <p className={`text-sm ${nameMsg.ok ? 'text-green-700' : 'text-red-700'}`}>
              {nameMsg.text}
            </p>
          )}
          <button className={btnCls} disabled={savingName}>
            {savingName ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="font-display text-2xl mb-5">Change password</h2>
        <form onSubmit={savePassword} className="space-y-4">
          <input
            type="password"
            className={inputCls}
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className={inputCls}
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          {pwMsg && (
            <p className={`text-sm ${pwMsg.ok ? 'text-green-700' : 'text-red-700'}`}>{pwMsg.text}</p>
          )}
          <button className={btnCls} disabled={savingPw}>
            {savingPw ? 'Saving…' : 'Change password'}
          </button>
        </form>
        <p className="text-xs text-stone mt-3">
          Changing your password signs out your other devices.
        </p>
      </div>

      <div>
        <h2 className="font-display text-2xl mb-3">Sessions</h2>
        <button
          onClick={async () => {
            await logoutEverywhere();
            navigate('/login');
          }}
          className="text-sm text-stone link-underline"
        >
          Log out of all devices
        </button>
      </div>
    </div>
  );
}
