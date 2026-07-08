import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ThumbsUp, ThumbsDown, MessageCircle, Send, FileText, X, Trash2, Calendar, User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

const LOGO_COACUM = "https://media.base44.com/images/public/6a18cbfaee75eb22cc08c34e/ef4d78394_logocoacum.jpg";

function formatDateFr(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function ArticleCard({ article, isAdmin, featured = false }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: likes = [] } = useQuery({
    queryKey: ["likes", article.id],
    queryFn: () => base44.entities.ArticleLike.filter({ article_id: article.id })
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", article.id],
    enabled: showComments,
    queryFn: () => base44.entities.ArticleComment.filter({ article_id: article.id }, "created_date")
  });

  const likeCount = likes.filter((l) => l.type === "like").length;
  const dislikeCount = likes.filter((l) => l.type === "dislike").length;
  const myLike = likes.find((l) => l.created_by_id === user?.id);

  const toggleLike = useMutation({
    mutationFn: async (type) => {
      if (myLike) {
        if (myLike.type === type) {
          await base44.entities.ArticleLike.delete(myLike.id);
        } else {
          await base44.entities.ArticleLike.update(myLike.id, { type });
        }
      } else {
        await base44.entities.ArticleLike.create({ article_id: article.id, type });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["likes", article.id] })
  });

  const addComment = useMutation({
    mutationFn: () => base44.entities.ArticleComment.create({
      article_id: article.id,
      contenu: commentText.trim(),
      auteur_nom: user?.full_name || "Anonyme"
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", article.id] });
      setCommentText("");
      toast.success("Commentaire ajouté");
    }
  });

  const deleteComment = useMutation({
    mutationFn: (id) => base44.entities.ArticleComment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", article.id] })
  });

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate();
  };

  const content = article.contenu || "";
  const shouldTruncate = content.length > 280 && !expanded;
  const displayContent = shouldTruncate ? content.slice(0, 280) + "..." : content;

  const CATEGORY_STYLES = {
    "Annonce": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    "Événement": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    "Activité": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    "Communiqué": "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    "Culture": "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    "Membre": "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  };
  const catStyle = CATEGORY_STYLES[article.categorie] || "bg-primary/10 text-primary";

  return (
    <article className={`group relative bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ${featured ? 'md:flex md:flex-row-reverse' : ''}`}>
      {/* Image or Logo */}
      <div className={`relative overflow-hidden ${featured ? 'md:w-1/2' : ''}`}>
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.titre}
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = LOGO_COACUM; }}
            className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${featured ? 'h-56 md:h-full min-h-[280px]' : 'h-48'}`}
          />
        ) : (
          <div className={`flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/10 to-orange-100 dark:from-primary/10 dark:via-secondary/10 dark:to-card ${featured ? 'h-56 md:h-full min-h-[280px]' : 'h-48'}`}>
            <img
              src={LOGO_COACUM}
              alt="Logo COACUM"
              className={`object-contain transition-transform duration-700 group-hover:scale-110 ${featured ? 'w-40 h-40' : 'w-28 h-28'}`}
            />
          </div>
        )}
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {featured && (
          <span className="absolute top-3 left-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
            <span className="text-xs">★</span> À LA UNE
          </span>
        )}
        {/* Category badge on image for non-featured */}
        {!featured && article.categorie && (
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md shadow-md ${catStyle}`}>
            {article.categorie}
          </span>
        )}
      </div>

      {/* Content */}
      <div className={`flex flex-col p-5 ${featured ? 'md:w-1/2 md:justify-center' : ''}`}>
        {/* Meta */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2 flex-wrap">
          {article.categorie && (
            <span className={`px-2 py-0.5 rounded-full font-semibold ${catStyle}`}>
              {article.categorie}
            </span>
          )}
          {article.date_publication && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateFr(article.date_publication)}
            </span>
          )}
          {article.auteur && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {article.auteur}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className={`font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors duration-200 ${featured ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
          {article.titre}
        </h2>

        {/* Content */}
        <p className={`text-muted-foreground text-sm leading-relaxed ${featured ? 'md:text-base' : ''} ${shouldTruncate ? 'line-clamp-none' : ''}`}>
          {displayContent}
        </p>

        {content.length > 280 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-1 self-start"
          >
            {expanded ? <>Réduire <ChevronUp className="h-3 w-3" /></> : <>Lire la suite <ChevronDown className="h-3 w-3" /></>}
          </button>
        )}

        {/* Document */}
        {article.document_url && (
          <a
            href={article.document_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary transition-all text-xs text-foreground group/doc"
          >
            <FileText className="h-4 w-4 text-primary group-hover/doc:scale-110 transition-transform" />
            <span className="truncate flex-1">{article.document_nom || "Document joint"}</span>
          </a>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border border-dashed">
          <button
            onClick={() => toggleLike.mutate("like")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              myLike?.type === "like"
                ? "bg-green-500/15 text-green-600"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <ThumbsUp className={`h-3.5 w-3.5 ${myLike?.type === "like" ? "fill-current" : ""}`} />
            {likeCount > 0 && likeCount}
          </button>

          <button
            onClick={() => toggleLike.mutate("dislike")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              myLike?.type === "dislike"
                ? "bg-red-500/15 text-red-600"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <ThumbsDown className={`h-3.5 w-3.5 ${myLike?.type === "dislike" ? "fill-current" : ""}`} />
            {dislikeCount > 0 && dislikeCount}
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showComments ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {comments.length > 0 ? comments.length : "Commenter"}
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 space-y-3 animate-in fade-in-0 duration-200">
            <form onSubmit={handleComment} className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Écrire un commentaire..."
                className="text-xs h-9"
              />
              <Button type="submit" size="icon" className="h-9 w-9 flex-shrink-0" disabled={!commentText.trim() || addComment.isPending}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>

            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">Soyez le premier à commenter</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2 p-2.5 rounded-lg bg-muted/40">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {(c.auteur_nom || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{c.auteur_nom || "Anonyme"}</p>
                      <p className="text-xs text-muted-foreground break-words">{c.contenu}</p>
                    </div>
                    {(c.created_by_id === user?.id || isAdmin) && (
                      <button
                        onClick={() => deleteComment.mutate(c.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}