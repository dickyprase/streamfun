import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import StatsCard from '@/components/Dashboard/StatsCard';
import { useAuth } from '@/context/AuthContext';

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading, siteSettings } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/dashboard');
      return;
    }
    if (isAdmin) fetchStats();
  }, [isAdmin, authLoading, router]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {}
    setLoading(false);
  };

  if (!isAdmin) return null;

  return (
    <>
      <Head>
        <title>Admin Dashboard - {siteSettings.site_name}</title>
      </Head>

      <DashboardLayout title="Admin Dashboard">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton h-28 rounded-xl" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <StatsCard
                title="Total User"
                value={stats.totalUsers}
                icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                color="primary"
                delay={0}
              />
              <StatsCard
                title="Admin"
                value={stats.totalAdmins}
                icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                color="red"
                delay={0.05}
              />
              <StatsCard
                title="User Biasa"
                value={stats.totalRegularUsers}
                icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                color="blue"
                delay={0.1}
              />
              <StatsCard
                title="Login Hari Ini"
                value={stats.todayLogins}
                icon="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                color="green"
                delay={0.15}
              />
              <StatsCard
                title="Login 7 Hari"
                value={stats.weekLogins}
                icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                color="yellow"
                delay={0.2}
              />
              <StatsCard
                title="Total Tontonan"
                value={stats.totalWatchHistory}
                icon="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                color="pink"
                delay={0.25}
              />
            </div>

            {/* Login Activity */}
            {stats.loginActivity && stats.loginActivity.length > 0 && (
              <div className="bg-dark-200 border border-dark-400 rounded-xl p-5 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">Aktivitas Login (7 Hari Terakhir)</h3>
                <div className="space-y-2">
                  {stats.loginActivity.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-dark-400 last:border-0">
                      <span className="text-sm text-gray-300">
                        {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                      <span className="text-sm font-semibold text-primary-400">{item.count} login</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Users */}
            <div className="bg-dark-200 border border-dark-400 rounded-xl p-5">
              <h3 className="text-lg font-bold text-white mb-4">User Terbaru</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-dark-400">
                      <th className="pb-3 font-medium">Nama</th>
                      <th className="pb-3 font-medium">Email</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Terdaftar</th>
                      <th className="pb-3 font-medium">Login Terakhir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.map((u, i) => (
                      <motion.tr
                        key={u.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-dark-400 last:border-0"
                      >
                        <td className="py-3 text-white font-medium">{u.name}</td>
                        <td className="py-3 text-gray-300">{u.email}</td>
                        <td className="py-3">
                          <span className={`badge text-xs ${u.role === 'admin' ? 'bg-primary-500/20 text-primary-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 text-gray-400">
                          {new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="py-3 text-gray-400">
                          {u.last_login
                            ? new Date(u.last_login).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : '-'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-400">Gagal memuat statistik.</p>
        )}
      </DashboardLayout>
    </>
  );
}
