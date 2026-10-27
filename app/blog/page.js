'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Calendar, Clock, ArrowRight, BookOpen, Eye, ChevronLeft, ChevronRight,
  Menu, X, Phone, MessageCircle, Tag
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT, useTranslatedArray } from '@/lib/useT';

export default function BlogPage() {
  const { t } = useT();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const blogCategories = [
    'Consigli di Viaggio', 'Destinazioni', 'Offerte', 'Guide', 'Novità', 'Esperienze'
  ];
  const { items: tCats } = useTranslatedArray(blogCategories.map((c, i) => ({ id: i, label: c })), ['label']);
  const { items: tPosts } = useTranslatedArray(posts, ['title', 'excerpt', 'category']);

  useEffect(() => {
    loadPosts();
  }, [page, selectedCategory]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      let url = `/api/blog?page=${page}&limit=9`;
      if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setPosts(data.posts || []);
      setTotalPages(data.pages || 1);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <img src="/logo.png" alt="Logo" className="h-14 w-auto" />
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link href="/wishlist">
                <Button variant="outline" className="rounded-full">Preferiti</Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" className="rounded-full">{t('catalog.home')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-ocean-900 via-ocean-800 to-ocean-900 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-8 h-8 text-coral-400" />
            <span className="text-coral-400 font-semibold">Blog & Magazine</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
            {t('home.blogStories')}
          </h1>
          <p className="text-xl text-white/70 mb-8">
            {t('home.blogSubtitle')}
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input 
              placeholder={t('home.blogSearch')} 
              className="pl-12 h-12 bg-white text-gray-900 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => { setSelectedCategory(''); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                !selectedCategory
                  ? 'bg-ocean-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('home.allLabel')}
            </button>
            {blogCategories.map((cat, ci) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setPage(1); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-ocean-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tCats[ci]?.label || cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">{t('home.loadingArticles')}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold text-gray-700 mb-2">{t('home.noArticles')}</h2>
            <p className="text-gray-500 mb-6">{t('home.noArticlesDesc')}</p>
            <Link href="/">
              <Button className="bg-ocean-500 hover:bg-ocean-600 rounded-full">{t('home.backHome')}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post, pi) => {
                const dp = tPosts[pi] || post;
                return (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 h-full hover:-translate-y-1">
                    <div className="relative h-52 overflow-hidden">
                      <img 
                        src={post.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600'}
                        alt={dp.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {post.category && (
                        <Badge className="absolute top-3 left-3 bg-ocean-500 border-0">{dp.category}</Badge>
                      )}
                    </div>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('it-IT') : t('home.draft')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readTime || '5 min'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {post.views || 0}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-lg text-ocean-900 mb-2 line-clamp-2 group-hover:text-ocean-500 transition-colors">
                        {dp.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4">{dp.excerpt}</p>
                      <span className="text-ocean-500 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                        {t('home.readMore')} <ArrowRight className="w-4 h-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-full"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button 
                    key={i}
                    variant={page === i + 1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(i + 1)}
                    className={`rounded-full ${page === i + 1 ? 'bg-ocean-500' : ''}`}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-full"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-ocean-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <Link href="/"><img src="/logo.png" alt="Logo" className="h-14 w-auto mx-auto mb-4 brightness-0 invert" /></Link>
          <p className="text-white/50 text-sm">{t('home.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
