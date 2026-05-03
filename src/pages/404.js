import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Halaman Tidak Ditemukan | StreamFront</title>
      </Head>

      <div className="container py-20 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-8xl mb-6">🎬</div>
          <h1 className="text-5xl font-black text-white mb-4">404</h1>
          <h2 className="text-xl font-semibold text-gray-300 mb-2">Halaman Tidak Ditemukan</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Sepertinya halaman yang Anda cari sudah dipindahkan atau tidak tersedia.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Kembali ke Home
              </motion.button>
            </Link>
            <Link href="/search">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Cari Konten
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
