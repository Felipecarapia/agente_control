"use client";

type Data = {
  headline?: string;
  subheadline?: string;
  cta_text?: string;
  cta_url?: string;
};

export function CTASection({ data }: { data: Data }) {
  if (!data.headline && !data.cta_text) return null;
  return (
    <section id="cta" className="px-6 py-20 bg-primary text-primary-foreground">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        {data.headline && (
          <h2 className="text-3xl md:text-4xl font-bold">{data.headline}</h2>
        )}
        {data.subheadline && (
          <p className="text-lg opacity-90">{data.subheadline}</p>
        )}
        {data.cta_text && (
          <a
            href={data.cta_url || "#"}
            data-cta="cta-section"
            className="inline-flex items-center justify-center rounded-lg bg-background text-foreground px-8 py-4 text-lg font-semibold shadow-lg hover:opacity-90 transition-opacity"
          >
            {data.cta_text}
          </a>
        )}
      </div>
    </section>
  );
}
