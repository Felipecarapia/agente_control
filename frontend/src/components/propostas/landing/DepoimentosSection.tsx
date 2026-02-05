"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Item = { nome?: string; texto?: string; role?: string; avatar_url?: string };
type Data = { titulo?: string; items?: Item[] };

export function DepoimentosSection({ data }: { data: Data }) {
  const items = data.items ?? [];
  if (items.length === 0 && !data.titulo) return null;
  return (
    <section className="px-6 py-16 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        {data.titulo && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            {data.titulo}
          </h2>
        )}
        <div className="grid gap-8 md:grid-cols-2">
          {items.map((item, i) => {
            const avatarUrl = item.avatar_url
              ? item.avatar_url.startsWith("http")
                ? item.avatar_url
                : API_URL + item.avatar_url
              : null;
            return (
              <blockquote key={i} className="rounded-xl border bg-card p-6 shadow-sm">
                {item.texto && <p className="text-muted-foreground mb-4">&ldquo;{item.texto}&rdquo;</p>}
                <footer className="flex items-center gap-3">
                  {avatarUrl && (
                    <img src={avatarUrl} alt={item.nome ?? ""} className="h-12 w-12 rounded-full object-cover" />
                  )}
                  <div>
                    {item.nome && <cite className="font-semibold not-italic">{item.nome}</cite>}
                    {item.role && <p className="text-sm text-muted-foreground">{item.role}</p>}
                  </div>
                </footer>
              </blockquote>
            );
          })}
        </div>
      </div>
    </section>
  );
}
