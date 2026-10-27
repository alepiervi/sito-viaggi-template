'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Clock, Eye, ArrowLeft, Share2, MessageCircle, BookOpen,
  Facebook, Twitter, ChevronRight
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useT, useTranslatedObject } from '@/lib/useT';
import { toHtml } from '@/lib/richtext';

export default function BlogPostPage() {
  const params = useParams();
  const { t } = useT();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const { obj: tPost } = useTranslatedObject(post, ['title', 'excerpt', 'category', 'content']);
  const p = tPost || post;

  useEffect(() => {
    if (params.slug) {
      loadPost();
    }
  }, [params.slug]);

  const loadPost = async () => {
    try {
      const response = await fetch(`/api/blog/${params.slug}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-ocean-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold text-gray-700 mb-2">{t('home.articleNotFound')}</h1>
          <Link href="/blog">
            <Button className="bg-ocean-500 hover:bg-ocean-600 rounded-full mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> {t('home.backToBlog')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
              <Link href="/blog">
                <Button variant="outline" className="rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Blog
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="relative h-[400px] md:h-[500px] w-full">
          <img 
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/80 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-3xl mx-auto">
              {post.category && (
                <Badge className="bg-coral-500 border-0 mb-3">{p.category}</Badge>
              )}
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">
                {p.title}
              </h1>
              <div className="flex items-center gap-4 text-white/70">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {post.readTime || `5 ${t('home.minRead')}`}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {post.views || 0} {t('home.reads')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        {!post.coverImage && (
          <div className="mb-8">
            {post.category && (
              <Badge className="bg-coral-500 border-0 mb-3">{p.category}</Badge>
            )}
            <h1 className="text-3xl md:text-5xl font-display font-bold text-ocean-900 mb-4">
              {p.title}
            </h1>
            <div className="flex items-center gap-4 text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('it-IT') : ''}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime || '5 min'}
              </span>
            </div>
          </div>
        )}

        {post.excerpt && (
          <p className="text-xl text-gray-600 mb-8 font-light leading-relaxed border-l-4 border-coral-500 pl-6">
            {p.excerpt}
          </p>
        )}

        <div 
          className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-ocean-900 prose-a:text-ocean-500 prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: toHtml(p.content) }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
            {post.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="rounded-full">{tag}</Badge>
            ))}
          </div>
        )}

        {/* Share */}
        <div className="flex items-center gap-4 mt-8 pt-8 border-t">
          <span className="text-gray-500 font-medium">{t('home.shareLabel')}</span>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
            if (typeof window !== 'undefined') window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank');
          }}>
            {t('home.shareFacebook')}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
            if (typeof window !== 'undefined') window.open(`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + window.location.href)}`, '_blank');
          }}>
            <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
          </Button>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-ocean-50 to-coral-50 rounded-2xl p-8 mt-12 text-center">
          <h3 className="text-2xl font-display font-bold text-ocean-900 mb-3">{t('home.inspiredTitle')}</h3>
          <p className="text-gray-600 mb-6">{t('home.inspiredDesc')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/#viaggi">
              <Button className="bg-ocean-500 hover:bg-ocean-600 rounded-full">
                {t('home.exploreTrips')} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Button className="bg-green-500 hover:bg-green-600 rounded-full">
              <MessageCircle className="w-4 h-4 mr-2" /> {t('home.writeWhatsapp')}
            </Button>
          </div>
        </div>
      </article>

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
