import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import AdminNav from '../../components/AdminNav';

const ROLES = ['customer', 'staff', 'manager', 'admin'];
const NEW_USER_ROLES = ['staff', 'manager', 'admin'];
const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm';

export default function AdminUsers() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await client.get('/users');
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      await client.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      await load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(id, role) {
    try {
      await client.patch(`/users/${id}/role`, { role });
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  }

  async function toggleStatus(u) {
    try {
      await client.patch(`/users/${u.id}/status`, { is_active: !u.is_active });
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <AdminNav />
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Users</h1>

      {isAdmin && (
        <form
          onSubmit={createUser}
          className="flex flex-wrap gap-2 items-end mb-8 p-4 border border-gray-200 rounded-lg"
        >
          <input
            className={inputCls}
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={inputCls}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className={inputCls}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className={inputCls}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {NEW_USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
            disabled={creating}
          >
            {creating ? 'Adding...' : 'Add user'}
          </button>
          {formError && <p className="w-full text-red-500 text-sm">{formError}</p>}
        </form>
      )}

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const editable = isAdmin && u.id !== user.id;
              return (
                <tr key={u.id} className="border-b border-gray-100">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2 text-gray-600">{u.email}</td>
                  <td className="py-2">
                    {editable ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-1"
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="capitalize">{u.role}</span>
                    )}
                  </td>
                  <td className="py-2">
                    {editable ? (
                      <button
                        onClick={() => toggleStatus(u)}
                        className={
                          u.is_active
                            ? 'text-green-600 hover:underline'
                            : 'text-red-500 hover:underline'
                        }
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </button>
                    ) : (
                      <span className={u.is_active ? 'text-green-600' : 'text-red-500'}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
