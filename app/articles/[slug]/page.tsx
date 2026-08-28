import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.body.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/articles" className="font-mono text-xs text-bone/50 hover:text-amber">
        ← All articles
      </Link>

      <article className="mt-6">
        <p className="font-mono text-xs text-bone/50 mb-2">
          {formatDate(article.published_at)}
          {article.author && ` · ${article.author}`}
        </p>
        <h1 className="font-display text-4xl text-bone tracking-wide mb-6">{article.title}</h1>
        {article.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="w-full rounded mb-6 border border-olive/30"
          />
        )}
        <div className="space-y-4">
          {paragraphs.map((p, i) => (
            <p key={i} className="font-body text-bone/90 leading-relaxed whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      </article>
    </main>
  );
}
