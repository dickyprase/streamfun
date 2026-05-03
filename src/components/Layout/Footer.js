import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Footer() {
  const { siteSettings } = useAuth();
  const siteName = siteSettings?.site_name || 'StreamFront';

  return (
    <footer className="bg-dark-200 border-t border-dark-300 py-10 mt-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                {siteSettings?.site_logo ? (
                  <img src={siteSettings.site_logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500 to-pink-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{siteName.charAt(0)}</span>
                  </div>
                )}
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-pink-500">
                {siteName}
              </span>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              {siteSettings?.site_description || 'Platform streaming film dan series terlengkap dengan koleksi konten Indonesia dan internasional.'}
            </p>
          </div>

          {/* Kategori */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Kategori</h3>
            <ul className="space-y-2">
              {[
                { href: '/category/trending', label: 'Trending', emoji: '🔥' },
                { href: '/category/kdrama', label: 'K-Drama', emoji: '🇰🇷' },
                { href: '/category/cdrama', label: 'C-Drama', emoji: '🇨🇳' },
                { href: '/category/anime', label: 'Anime', emoji: '🗾' },
                { href: '/category/action', label: 'Action', emoji: '💥' },
                { href: '/category/horror', label: 'Horror', emoji: '👻' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {item.emoji} {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/categories" className="text-primary-500 hover:text-primary-400 transition-colors font-medium text-sm">
                  Lihat Semua &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Bantuan */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Akun</h3>
            <ul className="space-y-2">
              {[
                { href: '/login', label: 'Masuk' },
                { href: '/register', label: 'Daftar' },
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/library', label: 'Library' },
                { href: '/search', label: 'Pencarian' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">Newsletter</h3>
            <p className="text-gray-400 mb-4 text-sm">
              Dapatkan update film dan series terbaru langsung ke email Anda.
            </p>
            <form className="flex" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Alamat email Anda"
                className="flex-1 bg-dark-300 text-white rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
              <button
                type="submit"
                className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-r-lg transition-colors text-sm"
              >
                Kirim
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-dark-300 mt-10 pt-8 text-center text-gray-500">
          <p className="text-sm">&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <div className="mt-4 max-w-3xl mx-auto text-xs text-gray-500">
            <p>
              <strong>Disclaimer:</strong> {siteName} adalah clone demo untuk tujuan pembelajaran.
              Semua data yang ditampilkan adalah dummy.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
