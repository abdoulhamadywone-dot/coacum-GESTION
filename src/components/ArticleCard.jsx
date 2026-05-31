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

  return (
    <article className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {article.image_url &&
      <img src={article.image_url} alt={article.titre} className="w-full h-56 object-cover" />
      }
      












































































      
    </article>);

}