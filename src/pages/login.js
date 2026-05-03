import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, siteSettings } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      const redirect = router.query.redirect || '/dashboard';
      router.push(redirect);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Login - {siteSettings.site_name}</title>
      </Head>

      <div className="min-h-[80vh] flex items-center justify-center px-4 -mt-16 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="bg-dark-200 border border-dark-400 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Masuk</h1>
              <p className="text-gray-400 text-sm mt-1">Masuk ke akun {siteSettings.site_name} Anda</p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4"
              >
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full bg-dark-300 border border-dark-400 text-white rounded-lg py-2.5 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Masuk'
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Belum punya akun?{' '}
                <Link href="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                  Daftar sekarang
                </Link>
              </p>
            </div>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-dark-400">
              <p className="text-xs text-gray-500 text-center mb-3">Demo Accounts</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setEmail('admin@streamfront.com'); setPassword('admin123'); }}
                  className="text-xs bg-dark-300 hover:bg-dark-400 text-gray-300 py-2 px-3 rounded-lg transition-colors text-center"
                >
                  <span className="block font-semibold text-primary-400">Admin</span>
                  <span className="text-gray-500">admin@streamfront.com</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setEmail('user@streamfront.com'); setPassword('user123'); }}
                  className="text-xs bg-dark-300 hover:bg-dark-400 text-gray-300 py-2 px-3 rounded-lg transition-colors text-center"
                >
                  <span className="block font-semibold text-blue-400">User</span>
                  <span className="text-gray-500">user@streamfront.com</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
