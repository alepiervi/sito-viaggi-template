import { findTenantDoc, buildMetadata, siteNameOf, plainText, baseUrlOf, jsonLd } from '@/lib/serverTenant';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { tenant, doc: post } = await findTenantDoc('blog_posts', { slug: params.slug, status: 'published' });
  if (!post) return buildMetadata({ tenant, title: `Articolo non trovato | ${siteNameOf(tenant)}` });
  return buildMetadata({
    tenant,
    title: `${post.metaTitle || post.title} | ${siteNameOf(tenant)}`,
    description: post.metaDescription || plainText(post.excerpt || post.content),
    image: post.coverImage,
    path: `/blog/${post.slug}`,
  });
}

export default async function BlogPostLayout({ children, params }) {
  const { tenant, doc: post } = await findTenantDoc('blog_posts', { slug: params.slug, status: 'published' });
  const data = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: plainText(post.excerpt || post.content, 300),
    image: post.coverImage ? [post.coverImage] : undefined,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { '@type': 'Organization', name: post.author || siteNameOf(tenant) },
    publisher: { '@type': 'Organization', name: siteNameOf(tenant) },
    mainEntityOfPage: `${baseUrlOf(tenant)}/blog/${post.slug}`,
  } : null;
  return (
    <>
      {data && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />}
      {children}
    </>
  );
}
