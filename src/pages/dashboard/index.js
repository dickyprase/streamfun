import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import StatsCard from '@/components/Dashboard/StatsCard';
import { useAuth } from '@/context/AuthContext';
import useLocalStorage from '@/hooks/useLocalStorage';

export default function UserDashboard() {
  const { user, siteSettings } = useAuth();
  const [history, setHistory] = useState([]);
  const [library] = useLocalStorage('streamfront-library', []);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/user/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {}
    setLoadingHistory(false);
  };

  return (
    <>
      <Head>
        <title>Dashboard - {siteSettings.site_name}</title>
      </Head>

      <DashboardLayout title="Dashboard">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-primary-500/20 to-pink-500/10 border border-primary-500/20 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white">
            Selamat datang, {user?.name}! 👋
          </h2>
          <p className="text-gray-300 text-sm mt-1">
            Kelola profil dan lihat aktivitas streaming Anda di sini.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatsCard
            title="Library"
            value={library.length}
            icon="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            color="primary"
            delay={0}
          />
          <StatsCard
            title="Riwayat Tontonan"
            value={history.length}
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            color="blue"
            delay={0.1}
          />
          <StatsCard
            title="Member Sejak"
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-'}
            icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            color="green"
            delay={0.2}
          />
        </div>

        {/* Recent Watch History */}
        <div className="bg-dark-200 border border-dark-400 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Terakhir Ditonton</h3>
            <Link href="/dashboard/history" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
              Lihat Semua
            </Link>
          </div>

          {loadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-16 h-10 skeleton rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-32 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">Belum ada riwayat tontonan</p>
              <Link href="/" className="text-primary-400 text-sm hover:text-primary-300 mt-2 inline-block">
                Mulai Menonton
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 5).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/detail/${item.content_slug || item.content_id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-16 h-10 rounded bg-dark-400 overflow-hidden flex-shrink-0">
                      {item.content_poster && (
                        <img src={item.content_poster} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.content_title || item.content_id}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(item.watched_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
