import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronRight, CheckCircle2, AlertCircle, Loader2, Clock, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || "Action";
  const status = toolCall?.status || "pending";

  const formattedName = name
    .replace(/_/g, " ")
    .replace("entities.", "")
    .toLowerCase();

  const statusConfig = {
    pending:     { icon: Clock,        color: "text-slate-400",  text: "En attente" },
    running:     { icon: Loader2,      color: "text-amber-500",  text: "En cours...", spin: true },
    in_progress: { icon: Loader2,      color: "text-amber-500",  text: "En cours...", spin: true },
    completed:   { icon: CheckCircle2, color: "text-green-600",  text: "Terminé" },
    success:     { icon: CheckCircle2, color: "text-green-600",  text: "Terminé" },
    failed:      { icon: AlertCircle,  color: "text-red-500",    text: "Erreur" },
    error:       { icon: AlertCircle,  color: "text-red-500",    text: "Erreur" },
  }[status] || { icon: Clock, color: "text-slate-400", text: "" };

  const Icon = statusConfig.icon;

  return (
    <div className="mt-1.5 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all bg-white",
          expanded ? "border-amber-200 bg-amber-50" : "border-slate-200 hover:bg-slate-50"
        )}
      >
        <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span className="text-slate-600 capitalize">{formattedName}</span>
        {statusConfig.text && <span className="text-slate-400">• {statusConfig.text}</span>}
        {!statusConfig.spin && toolCall.arguments_string && (
          <ChevronRight className={cn("h-3 w-3 text-slate-400 ml-auto transition-transform", expanded && "rotate-90")} />
        )}
      </button>

      {expanded && !statusConfig.spin && toolCall.arguments_string && (
        <div className="mt-1 ml-3 pl-3 border-l-2 border-amber-200">
          <pre className="bg-slate-50 rounded p-2 text-xs text-slate-600 whitespace-pre-wrap overflow-auto max-h-32">
            {(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ChatMessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={cn("max-w-[80%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-amber-500 text-white"
              : "bg-white border border-slate-200 shadow-sm text-slate-800"
          )}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="my-0">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  h3: ({ children }) => <h3 className="font-semibold text-slate-900 mt-2 mb-1">{children}</h3>,
                  code: ({ children }) => <code className="px-1 py-0.5 rounded bg-slate-100 text-xs font-mono">{children}</code>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {message.tool_calls?.length > 0 && (
          <div className="mt-1 space-y-1">
            {message.tool_calls.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  );
}