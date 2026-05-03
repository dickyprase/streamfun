import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { useAuth } from '@/context/AuthContext';

export default function HistoryPage() {
  const { siteSettings } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Riwayat Tontonan - {siteSettings.site_name}</title>
      </Head>

      <DashboardLayout title="Riwayat Tontonan">
        <div className="bg-dark-200 border border-dark-400 rounded-xl p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-24 h-14 skeleton rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-40 rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📺</div>
              <h3 className="text-lg font-semibold text-white mb-2">Belum Ada Riwayat</h3>
              <p className="text-gray-400 text-sm mb-4">Mulai menonton untuk melihat riwayat di sini.</p>
              <Link href="/" className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                Jelajahi Konten
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link href={`/detail/${item.content_slug || item.content_id}`} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                    <div className="w-24 h-14 rounded-lg bg-dark-400 overflow-hidden flex-shrink-0">
                      {item.content_poster && (
                        <img src={item.content_poster} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                        {item.content_title || item.content_id}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Ditonton {new Date(item.watched_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-primary-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
