import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

export default function AdminUsersPage() {
  const { isAdmin, loading: authLoading, siteSettings } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '' });
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  const fetchUsers = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setPagination(data.pagination);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, search);
  };

  const startEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({ name: user.name, email: user.email, role: user.role });
    setActionMsg({ type: '', text: '' });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', email: '', role: '' });
  };

  const saveEdit = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? data.user : u));
        setEditingUser(null);
        setActionMsg({ type: 'success', text: 'User berhasil diupdate' });
      } else {
        setActionMsg({ type: 'error', text: data.error });
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Gagal mengupdate user' });
    }
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Hapus user "${userName}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        setActionMsg({ type: 'success', text: 'User berhasil dihapus' });
        setPagination(prev => ({ ...prev, total: prev.total - 1 }));
      } else {
        setActionMsg({ type: 'error', text: data.error });
      }
    } catch {
      setActionMsg({ type: 'error', text: 'Gagal menghapus user' });
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <Head>
        <title>Kelola User - {siteSettings.site_name}</title>
      </Head>

      <DashboardLayout title="Kelola User">
        {/* Search & Info */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="flex-1 bg-dark-300 border border-dark-400 text-white rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <button type="submit" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
              Cari
            </button>
          </form>
          <div className="text-sm text-gray-400 flex items-center">
            Total: <span className="text-white font-semibold ml-1">{pagination.total}</span> user
          </div>
        </div>

        {/* Action Message */}
        <AnimatePresence>
          {actionMsg.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-sm rounded-lg p-3 mb-4 ${
                actionMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}
            >
              {actionMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Users Table */}
        <div className="bg-dark-200 border border-dark-400 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 bg-dark-300">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Nama</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Terdaftar</th>
                  <th className="p-4 font-medium">Login Terakhir</th>
                  <th className="p-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-t border-dark-400">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="skeleton h-4 w-20 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">Tidak ada user ditemukan</td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-t border-dark-400 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-gray-400">#{u.id}</td>
                      <td className="p-4">
                        {editingUser === u.id ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-dark-300 border border-dark-400 text-white rounded px-2 py-1 text-sm w-full focus:ring-1 focus:ring-primary-500 focus:outline-none"
                          />
                        ) : (
                          <span className="text-white font-medium">{u.name}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingUser === u.id ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="bg-dark-300 border border-dark-400 text-white rounded px-2 py-1 text-sm w-full focus:ring-1 focus:ring-primary-500 focus:outline-none"
                          />
                        ) : (
                          <span className="text-gray-300">{u.email}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {editingUser === u.id ? (
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            className="bg-dark-300 border border-dark-400 text-white rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary-500 focus:outline-none"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <span className={`badge text-xs ${u.role === 'admin' ? 'bg-primary-500/20 text-primary-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-4 text-gray-400 whitespace-nowrap">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        {editingUser === u.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => saveEdit(u.id)} className="text-green-400 hover:text-green-300 p-1.5 rounded hover:bg-green-500/10 transition-colors" title="Simpan">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={cancelEdit} className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors" title="Batal">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(u)} className="text-blue-400 hover:text-blue-300 p-1.5 rounded hover:bg-blue-500/10 transition-colors" title="Edit">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => deleteUser(u.id, u.name)} className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors" title="Hapus">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-dark-400">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => fetchUsers(page, search)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    pagination.page === page
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
