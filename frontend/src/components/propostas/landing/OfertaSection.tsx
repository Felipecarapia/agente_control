"use client";

type Data = {
  titulo?: string;
  valor?: string;
  parcelas?: string;
  garantia?: string;
  cta_text?: string;
  destaques?: string[];
};

export function OfertaSection({ data }: { data: Data }) {
  const destaques = (data.destaques ?? []).filter(Boolean);
  if (!data.titulo && !data.valor && !data.cta_text) return null;
  return (
    <section id="oferta" className="px-6 py-20 bg-primary/10">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {data.titulo && (
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">{data.titulo}</h2>
        )}
        {data.valor && (
          <p className="text-4xl md:text-5xl font-bold text-primary">{data.valor}</p>
        )}
        {data.parcelas && (
          <p className="text-lg text-muted-foreground">{data.parcelas}</p>
        )}
        {data.garantia && (
          <p className="text-sm font-medium text-foreground">{data.garantia}</p>
        )}
        {destaques.length > 0 && (
          <ul className="space-y-2 text-left max-w-md mx-auto">
            {destaques.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-muted-foreground">
                <span className="text-primary">✓</span> {d}
              </li>
            ))}
          </ul>
        )}
        {data.cta_text && (
          <a
            href="#cta"
            data-cta="oferta"
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-8 py-4 text-lg font-semibold shadow-lg hover:opacity-90 transition-opacity"
          >
            {data.cta_text}
          </a>
        )}
      </div>
    </section>
  );
}
