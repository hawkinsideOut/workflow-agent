import { MDXRemote } from 'next-mdx-remote/rsc';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

const contentDir = path.join(process.cwd(), 'content');

const docs = [
  { slug: 'getting-started', title: 'Getting Started' },
  { slug: 'presets', title: 'Presets' },
  { slug: 'custom-scopes', title: 'Custom Scopes' },
  { slug: 'configuration', title: 'Configuration' },
];

export async function generateStaticParams() {
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

async function getDoc(slug: string) {
  const filePath = path.join(contentDir, `${slug}.mdx`);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);
  return { frontmatter: data, content };
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { frontmatter, content } = await getDoc(slug);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="border-b bg-white dark:bg-gray-800">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Workflow Agent
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          <aside className="w-64 flex-shrink-0">
            <nav className="space-y-2 sticky top-8">
              {docs.map((doc) => (
                <Link
                  key={doc.slug}
                  href={`/docs/${doc.slug}`}
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    slug === doc.slug
                      ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {doc.title}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="flex-1 max-w-4xl">
            <article className="prose prose-lg dark:prose-invert max-w-none">
              <MDXRemote
                source={content}
                options={{
                  mdxOptions: {
                    rehypePlugins: [
                      rehypeHighlight,
                      rehypeSlug,
                      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
                    ],
                  },
                }}
              />
            </article>
          </main>
        </div>
      </div>
    </div>
  );
}
