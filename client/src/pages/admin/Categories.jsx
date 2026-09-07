import { useEffect, useState } from 'react';
import client from '../../api/client';
import AdminNav from '../../components/AdminNav';

const inputCls = 'border border-gray-300 rounded-md px-3 py-2 text-sm';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { id, name }

  function load() {
    setLoading(true);
    client
      .get('/categories')
      .then((res) => { setCategories(res.data); setError(null); })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load categories'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await client.post('/categories', { name });
      setName('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function saveEdit() {
    try {
      await client.patch(`/categories/${editing.id}`, { name: editing.name });
      setEditing(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to rename');
    }
  }

  async function remove(c) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await client.delete(`/categories/${c.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <AdminNav />
      <h1 className="text-2xl font-semibold text-gray-900 mb-4">Categories</h1>

      <form onSubmit={create} className="flex gap-2 mb-6">
        <input className={inputCls} placeholder="New category name" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <button className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
          disabled={creating}>
          {creating ? 'Adding...' : 'Add'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-2">Name</th>
              <th className="py-2">Slug</th>
              <th className="py-2">Products</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-gray-100">
                <td className="py-2">
                  {editing?.id === c.id ? (
                    <input className={inputCls} value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="py-2 text-gray-500">{c.slug}</td>
                <td className="py-2">{c.product_count}</td>
                <td className="py-2 text-right space-x-3">
                  {editing?.id === c.id ? (
                    <>
                      <button onClick={saveEdit} className="text-gray-900 hover:underline">Save</button>
                      <button onClick={() => setEditing(null)} className="text-gray-500 hover:underline">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing({ id: c.id, name: c.name })}
                        className="text-gray-600 hover:underline">Rename</button>
                      <button onClick={() => remove(c)} className="text-red-500 hover:underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
