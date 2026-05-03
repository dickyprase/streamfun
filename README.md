# StreamFront

Platform streaming film dan series. Dibangun dengan Next.js, Tailwind CSS, dan SQLite.

## Tech Stack

- **Framework**: Next.js 14 (Pages Router)
- **Frontend**: React 18, Tailwind CSS, Framer Motion
- **Database**: SQLite (better-sqlite3)
- **Auth**: JWT + bcrypt + HTTP-only cookies
- **Video Player**: HLS.js (custom player dengan glassmorphism UI)

## Prasyarat

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- npm / yarn / pnpm

## Instalasi

### 1. Clone repository

```bash
git clone https://github.com/dickyprase/streamfun.git
cd streamfun
```

### 2. Install dependencies

```bash
npm install
```

### 3. Buat file environment

Buat file `.env.local` di root project:

```env
STREAMKEUN_API_BASE=https://rest-api.streamkeun.web.id/v1/movies
STREAMKEUN_API_KEY=your_api_key_here
JWT_SECRET=ganti-dengan-secret-key-yang-aman
```

| Variable | Keterangan |
|----------|------------|
| `STREAMKEUN_API_BASE` | Base URL API konten streaming |
| `STREAMKEUN_API_KEY` | API key untuk akses konten |
| `JWT_SECRET` | Secret key untuk JWT auth (opsional, ada default) |

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

> Database SQLite akan otomatis dibuat di folder `data/` saat pertama kali dijalankan. Tidak perlu setup manual.

## Akun Default

Saat pertama kali dijalankan, sistem otomatis membuat akun berikut:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@streamfront.com` | `admin123` |
| User | `user@streamfront.com` | `user123` |

> Segera ganti password default setelah login.

## Build Production

```bash
npm run build
npm start
```

## Struktur Project

```
streamfun/
├── data/                    # SQLite database (auto-generated)
├── public/                  # Static assets & uploads
├── src/
│   ├── components/          # React components
│   │   ├── Content/         # ContentGrid, ContentCard, CategoryTabs
│   │   ├── Hero/            # HeroBanner
│   │   ├── Layout/          # Layout wrapper
│   │   ├── Player/          # VideoPlayer, PlayerControls, EpisodeList
│   │   └── UI/              # SkeletonCard, dll
│   ├── context/             # AuthContext
│   ├── hooks/               # useLocalStorage, dll
│   ├── lib/                 # Core libraries
│   │   ├── auth.js          # JWT auth helpers
│   │   ├── db.js            # SQLite setup & migrations
│   │   ├── api-client.js    # External API client
│   │   ├── constants.js     # API config
│   │   └── providers/       # Content provider & normalizer
│   ├── pages/               # Next.js routes
│   │   ├── api/             # Backend API routes
│   │   │   ├── auth/        # Login, register, logout
│   │   │   ├── proxy/       # Stream, play, browse, search, dll
│   │   │   ├── admin/       # Admin endpoints
│   │   │   └── user/        # User history
│   │   ├── admin/           # Admin panel
│   │   ├── dashboard/       # User dashboard & history
│   │   ├── detail/[slug]    # Halaman detail & video player
│   │   ├── category/[slug]  # Halaman kategori
│   │   └── ...              # Home, search, login, register, dll
│   └── styles/              # Global CSS
├── .env.local               # Environment variables (buat manual)
├── package.json
├── tailwind.config.js
└── next.config.mjs
```

## Fitur

- Streaming video dengan custom HLS player
- Browse film & series berdasarkan genre/negara
- Pencarian konten
- Multi-quality video (pilih resolusi)
- Subtitle multi-bahasa
- Watch history (tersimpan per user)
- Library pribadi (localStorage)
- Episode list dengan range selector (1-50, 51-100, dst)
- Admin panel (kelola user & pengaturan situs)
- Responsive design (mobile/tablet/desktop)
- Keyboard shortcuts (Space, F, M, J, L, Arrow keys)
