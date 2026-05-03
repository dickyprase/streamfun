import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import HeroBanner from '@/components/Hero/HeroBanner';
import CategoryTabs from '@/components/Content/CategoryTabs';
import ContentGrid from '@/components/Content/ContentGrid';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { siteSettings } = useAuth();
  const [activeTab, setActiveTab] = useState(0); // tabId from API
  const [tabs, setTabs] = useState([]);
  const [sections, setSections] = useState([]);
  const [banners, setBanners] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabTitle, setTabTitle] = useState('Trending');

  // Fetch tabs on mount
  useEffect(() => {
    fetchTabs();
    fetchHome(0);
  }, []);

  const fetchTabs = async () => {
    try {
      const res = await fetch('/api/proxy/tabs');
      if (res.ok) {
        const data = await res.json();
        setTabs(data.tabs || []);
      }
    } catch {}
  };

  const fetchHome = useCallback(async (tabId) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/home?tabId=${tabId}`);
      if (res.ok) {
        const data = await res.json();
        const secs = data.sections || [];

        // Extract banners
        const bannerSection = secs.find(s => s.type === 'BANNER');
        if (bannerSection) {
          setBanners(bannerSection.banners);
        }

        // Extract content items from all non-banner sections
        const allItems = secs
          .filter(s => s.type !== 'BANNER' && s.items.length > 0)
          .flatMap(s => s.items);

        // Remove duplicates by id
        const uniqueItems = [];
        const seen = new Set();
        for (const item of allItems) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            uniqueItems.push(item);
          }
        }

        setContent(uniqueItems);
        setSections(secs.filter(s => s.type !== 'BANNER'));
      }
    } catch (err) {
      console.error('Failed to fetch home:', err);
    }
    setLoading(false);
  }, []);

  const handleTabChange = (tabId, tabName) => {
    setActiveTab(tabId);
    setTabTitle(tabName);

    // For trending tab, use trending endpoint
    if (tabId === 1) {
      fetchTrending();
    } else {
      fetchHome(tabId);
    }
  };

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/trending?page=1');
      if (res.ok) {
        const data = await res.json();
        setContent(data.items || []);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>{siteSettings.site_name} - Nonton Film & Series Terbaru</title>
        <meta name="description" content={siteSettings.site_description} />
      </Head>

      {/* Hero Banner */}
      <HeroBanner banners={banners} />

      {/* Category Tabs */}
      <div className="container py-4">
        <CategoryTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Section Title */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 mb-4"
        >
          <h2 className="text-lg font-bold text-white">{tabTitle}</h2>
        </motion.div>
      </div>

      {/* Content Grid */}
      <div className="container pb-12">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ContentGrid items={content} loading={loading} />
        </motion.div>
      </div>
    </>
  );
}
