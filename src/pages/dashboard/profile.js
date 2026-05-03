import { useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, updateUser, siteSettings } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setProfileLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (res.ok) {
        updateUser(data.user);
        setProfileMsg({ type: 'success', text: 'Profil berhasil diupdate' });
      } else {
        setProfileMsg({ type: 'error', text: data.error });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Terjadi kesalahan' });
    }
    setProfileLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Password baru dan konfirmasi tidak cocok' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg({ type: 'success', text: 'Password berhasil diubah' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: data.error });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Terjadi kesalahan' });
    }
    setPasswordLoading(false);
  };

  return (
    <>
      <Head>
        <title>Profil - {siteSettings.site_name}</title>
      </Head>

      <DashboardLayout title="Profil Saya">
        <div className="space-y-6 max-w-2xl">
          {/* Profile Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-200 border border-dark-400 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Informasi Profil</h3>

            {profileMsg.text && (
              <div className={`text-sm rounded-lg p-3 mb-4 ${
                profileMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nama</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
                <input
                  type="text"
                  value={user?.role || 'user'}
                  className="w-full bg-dark-400 border border-dark-400 text-gray-400 rounded-lg py-2.5 px-4 text-sm cursor-not-allowed"
                  disabled
                />
              </div>
              <button
                type="submit"
                disabled={profileLoading}
                className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium py-2.5 px-5 rounded-lg transition-colors text-sm"
              >
                {profileLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </motion.div>

          {/* Password Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-200 border border-dark-400 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Ubah Password</h3>

            {passwordMsg.text && (
              <div className={`text-sm rounded-lg p-3 mb-4 ${
                passwordMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password Saat Ini</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium py-2.5 px-5 rounded-lg transition-colors text-sm"
              >
                {passwordLoading ? 'Mengubah...' : 'Ubah Password'}
              </button>
            </form>
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
}
