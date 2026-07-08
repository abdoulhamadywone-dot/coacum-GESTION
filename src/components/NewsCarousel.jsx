import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function NewsCarousel({ articles = [] }) {
  const [current, setCurrent] = useState(0);
  const count = articles.length;

  const next = useCallback(() => setCurrent(c => (c + 1) % count), [count]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + count) % count), [count]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, count]);

  useEffect(() => { if (current >= count) setCurrent(0); }, [count, current]);

  if (count === 0) return null;
  const article = articles[current];

  return (
    <div className="relative w-full h-56 sm:h-64 md:h-80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl group">
      {article.image_url ? (
        <img src={article.image_url} alt={article.titre}
          className="absolute inset-0 w-full h-full object-cover animate-[kenburns_6s_ease-out_forwards]" key={current} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-orange-600" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 md:p-8 text-white">
        {article.categorie && (
          <span className="inline-block bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[9px] sm:text-[10px] font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full mb-2 sm:mb-3 uppercase tracking-wide shadow-lg">
            {article.categorie}
          </span>
        )}
        <h2 className="text-lg sm:text-xl md:text-3xl font-bold leading-tight mb-1 line-clamp-2 drop-shadow-lg">{article.titre}</h2>
        <p className="text-xs sm:text-sm opacity-80 line-clamp-1 md:line-clamp-2 max-w-2xl">{article.contenu}</p>
        {article.date_publication && (
          <p className="text-xs opacity-60 mt-2">
            {new Date(article.date_publication).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button onClick={prev}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all md:opacity-0 md:group-hover:opacity-100">
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button onClick={next}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all md:opacity-0 md:group-hover:opacity-100">
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 sm:bottom-3 right-3 sm:right-4 flex gap-1.5">
            {articles.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'w-8 bg-white shadow-md' : 'w-2 bg-white/40 hover:bg-white/70'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}