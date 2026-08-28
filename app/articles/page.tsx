import Link from "next/link";
import { getArticles } from "@/lib/queries";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ArticlesPage() {
  const articles = await getArticles();

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-4xl text-bone tracking-wide mb-8">Articles</h1>

      {articles.length === 0 ? (
        <p className="font-body text-bone/60">No articles published yet.</p>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="block fossil-card bg-basalt border border-olive/30 hover:border-amber/60 transition-colors px-5 py-4"
            >
              <p className="font-mono text-xs text-bone/50 mb-1">
                {formatDate(article.published_at)}
                {article.author && ` · ${article.author}`}
              </p>
              <p className="font-display text-2xl text-bone tracking-wide">{article.title}</p>
              <p className="font-body text-bone/60 mt-1 line-clamp-2">
                {article.body.slice(0, 180)}
                {article.body.length > 180 ? "…" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
