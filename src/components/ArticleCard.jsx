import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ThumbsUp, ThumbsDown, MessageCircle, Send, FileText, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

export default function ArticleCard({ article, isAdmin }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: likes = [] } = useQuery({
    queryKey: ["likes", article.id],
    queryFn: () => base44.entities.ArticleLike.filter({ article_id: article.id }),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", article.id],
    enabled: showComments,
    queryFn: () => base44.entities.ArticleComment.filter({ article_id: article.id }, "created_date"),
  });

  const likeCount = likes.filter(l => l.type === "like").length;
  const dislikeCount = likes.filter(l => l.type === "dislike").length;
  const myLike = likes.find(l => l.created_by_id === user?.id);

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["likes", article.id] }),
  });

  const addComment = useMutation({
    mutationFn: () => base44.entities.ArticleComment.create({
      article_id: article.id,
      contenu: commentText.trim(),
      auteur_nom: user?.full_name || "Anonyme",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", article.id] });
      setCommentText("");
      toast.success("Commentaire ajouté");
    },
  });

  const deleteComment = useMutation({
    mutationFn: (id) => base44.entities.ArticleComment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", article.id] }),
  });

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate();
  };

  return (
    <article className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {article.image_url && (
        <img src={article.image_url} alt={article.titre} className="w-full h-56 object-cover" />
      )}
      <div className="p-6">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
          {article.date_publication && <span>📅 {article.date_publication}</span>}
          {article.auteur && <span>✍️ {article.auteur}</span>}
        </div>

        {/* Title & Content */}
        <h2 className="text-xl font-bold text-foreground mb-3">{article.titre}</h2>
        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{article.contenu}</p>

        {/* Document attachment */}
        {article.document_url && (
          <a href={article.document_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm text-foreground hover:bg-muted transition-colors">
            <FileText className="h-4 w-4 text-primary" />
            {article.document_nom || "Télécharger le document"}
          </a>
        )}

        {/* Reactions */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
          <button
            onClick={() => toggleLike.mutate("like")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${myLike?.type === "like" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
          >
            <ThumbsUp className="h-4 w-4" /> {likeCount}
          </button>
          <button
            onClick={() => toggleLike.mutate("dislike")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${myLike?.type === "dislike" ? "bg-destructive text-white" : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"}`}
          >
            <ThumbsDown className="h-4 w-4" /> {dislikeCount}
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all ml-auto"
          >
            <MessageCircle className="h-4 w-4" />
            Commentaires {comments.length > 0 && `(${comments.length})`}
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="mt-4 space-y-3">
            {comments.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-foreground">{c.auteur_nom}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{c.contenu}</p>
                    </div>
                    {(isAdmin || c.created_by_id === user?.id) && (
                      <button onClick={() => deleteComment.mutate(c.id)} className="p-1 rounded hover:bg-destructive/10 flex-shrink-0">
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Soyez le premier à commenter</p>}
            <form onSubmit={handleComment} className="flex gap-2">
              <Input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Écrire un commentaire..."
                className="flex-1 text-sm"
              />
              <Button type="submit" size="sm" disabled={addComment.isPending || !commentText.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}