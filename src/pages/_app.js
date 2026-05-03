import '@/styles/globals.css';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout/Layout';
import { AuthProvider } from '@/context/AuthContext';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  return (
    <AuthProvider>
      <AnimatePresence mode="wait" initial={false}>
        <Layout key={router.pathname}>
          <Component {...pageProps} />
        </Layout>
      </AnimatePresence>
    </AuthProvider>
  );
}
