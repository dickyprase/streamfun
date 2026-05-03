import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

export default function AdminSettingsPage() {
  const { isAdmin, loading: authLoading, siteSettings, refreshSettings } = useAuth();
  const router = useRouter();
  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [siteLogo, setSiteLogo] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [logoMsg, setLogoMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
      return;
    }
    if (isAdmin) fetchSettings();
  }, [isAdmin, authLoading, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSiteName(data.settings.site_name || '');
        setSiteDescription(data.settings.site_description || '');
        setSiteLogo(data.settings.site_logo || '');
      }
    } catch {}
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });
    setLoading(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_name: siteName,
          site_description: siteDescription,
          site_logo: siteLogo,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: 'Pengaturan berhasil disimpan' });
        refreshSettings();
      } else {
        setMsg({ type: 'error', text: data.error });
      }
    } catch {
      setMsg({ type: 'error', text: 'Gagal menyimpan pengaturan' });
    }
    setLoading(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLogoMsg({ type: 'error', text: 'Format file harus PNG, JPG, atau WebP' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoMsg({ type: 'error', text: 'Ukuran file maksimal 2MB' });
      return;
    }

    setUploadLoading(true);
    setLogoMsg({ type: '', text: '' });

    const formData = new FormData();
    formData.append('logo', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSiteLogo(data.url);
        setLogoMsg({ type: 'success', text: 'Logo berhasil diupload. Klik "Simpan" untuk menerapkan.' });
      } else {
        setLogoMsg({ type: 'error', text: data.error });
      }
    } catch {
      setLogoMsg({ type: 'error', text: 'Gagal upload logo' });
    }
    setUploadLoading(false);
  };

  if (!isAdmin) return null;

  return (
    <>
      <Head>
        <title>Pengaturan - {siteSettings.site_name}</title>
      </Head>

      <DashboardLayout title="Pengaturan Website">
        <div className="max-w-2xl space-y-6">
          {/* Site Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-200 border border-dark-400 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Informasi Website</h3>

            {msg.text && (
              <div className={`text-sm rounded-lg p-3 mb-4 ${
                msg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nama Website</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Nama website Anda"
                  className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Nama ini akan tampil di navbar dan footer.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Deskripsi Website</label>
                <textarea
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder="Deskripsi singkat website"
                  rows={3}
                  className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-medium py-2.5 px-5 rounded-lg transition-colors text-sm"
              >
                {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </form>
          </motion.div>

          {/* Logo Upload */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-200 border border-dark-400 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Logo Website</h3>

            {logoMsg.text && (
              <div className={`text-sm rounded-lg p-3 mb-4 ${
                logoMsg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {logoMsg.text}
              </div>
            )}

            {/* Current Logo Preview */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-dark-300 border border-dark-400 flex items-center justify-center overflow-hidden">
                {siteLogo ? (
                  <img src={siteLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">{siteName?.charAt(0) || 'S'}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-white font-medium">Logo saat ini</p>
                <p className="text-xs text-gray-400">{siteLogo || 'Menggunakan logo default'}</p>
              </div>
            </div>

            {/* Upload */}
            <div className="border-2 border-dashed border-dark-400 rounded-xl p-6 text-center hover:border-primary-500/50 transition-colors">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
                disabled={uploadLoading}
              />
              <label htmlFor="logo-upload" className="cursor-pointer">
                {uploadLoading ? (
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                <p className="text-sm text-gray-300">Klik untuk upload logo baru</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, atau WebP. Maksimal 2MB.</p>
              </label>
            </div>

            {siteLogo && (
              <button
                onClick={() => { setSiteLogo(''); setLogoMsg({ type: 'success', text: 'Logo dihapus. Klik "Simpan Pengaturan" di atas untuk menerapkan.' }); }}
                className="mt-3 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Hapus Logo
              </button>
            )}
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-200 border border-dark-400 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Preview Navbar</h3>
            <div className="bg-dark-100 rounded-lg p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                {siteLogo ? (
                  <img src={siteLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{siteName?.charAt(0) || 'S'}</span>
                  </div>
                )}
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-pink-500">
                {siteName || 'StreamFront'}
              </span>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
}
