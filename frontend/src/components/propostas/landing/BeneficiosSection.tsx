"use client";

type Item = { titulo?: string; descricao?: string; icon?: string };
type Data = { titulo?: string; items?: Item[] };

export function BeneficiosSection({ data }: { data: Data }) {
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
        <ul className="grid gap-8 md:grid-cols-2">
          {items.map((item, i) => (
            <li key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              {item.titulo && (
                <h3 className="text-xl font-semibold mb-2 text-foreground">{item.titulo}</h3>
              )}
              {item.descricao && (
                <p className="text-muted-foreground">{item.descricao}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
