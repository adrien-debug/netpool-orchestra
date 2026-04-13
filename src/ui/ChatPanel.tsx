import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, Send, X, Loader } from "lucide-react";
import { useAppStore } from "@core/store";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const snapshot = useAppStore((s) => s.snapshot);
  const runAction = useAppStore((s) => s.runAction);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const buildSystemPrompt = () => {
    const svcSummary = snapshot.services.map((s) => `${s.name}: ${s.status} (${s.instances}/${s.expectedInstances})`).join(", ") || "aucun";
    const alertSummary = snapshot.alerts.map((a) => `[${a.severity}] ${a.title}`).join(", ") || "aucune";
    const cpuMetric = snapshot.metrics.find((m) => m.id === "cpu");
    const ramMetric = snapshot.metrics.find((m) => m.id === "ram");
    return `Tu es Orchestra, un assistant expert en infrastructure de développement local.
Voici l'état actuel de la machine :
- CPU: ${cpuMetric?.value ?? "N/A"}
- RAM disponible: ${ramMetric?.value ?? "N/A"}
- Services: ${svcSummary}
- Alertes: ${alertSummary}
Tu peux recommander des actions. Réponds en français, de manière concise et actionnable.`;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);

    if (!window.orchestra?.ai) {
      setMessages([...updated, { role: "assistant", content: "L'AI n'est pas configurée. Va dans Réglages pour ajouter une clé API." }]);
      return;
    }

    setStreaming(true);
    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages([...updated, assistantMsg]);

    const apiMessages = updated.map((m) => ({ role: m.role, content: m.content }));

    const unsubChunk = window.orchestra.ai.onStreamChunk((chunk: string) => {
      assistantMsg.content += chunk;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...assistantMsg };
        return next;
      });
    });

    const unsubDone = window.orchestra.ai.onStreamDone(() => {
      setStreaming(false);
      cleanup();
    });

    const unsubError = window.orchestra.ai.onStreamError((err: string) => {
      assistantMsg.content += `\n\n[Erreur: ${err}]`;
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...assistantMsg };
        return next;
      });
      setStreaming(false);
      cleanup();
    });

    function cleanup() { unsubChunk(); unsubDone(); unsubError(); }

    try {
      await window.orchestra.ai.chatStream(apiMessages, { systemPrompt: buildSystemPrompt() });
    } catch {
      assistantMsg.content = "Erreur de connexion à l'AI.";
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { ...assistantMsg };
        return next;
      });
      setStreaming(false);
      cleanup();
    }
  };

  const handleActionClick = (actionId: string) => {
    void runAction(actionId);
  };

  const renderContent = (content: string) => {
    const actionRegex = /\[action:(\S+)\]/g;
    const parts: (string | { actionId: string })[] = [];
    let last = 0;
    let match;
    while ((match = actionRegex.exec(content)) !== null) {
      if (match.index > last) parts.push(content.slice(last, match.index));
      parts.push({ actionId: match[1] });
      last = match.index + match[0].length;
    }
    if (last < content.length) parts.push(content.slice(last));

    return parts.map((part, i) => {
      if (typeof part === "string") return <span key={i}>{part}</span>;
      return (
        <button key={i} className="button button-secondary chat-action-btn" onClick={() => handleActionClick(part.actionId)}>
          {part.actionId}
        </button>
      );
    });
  };

  if (!open) {
    return (
      <button className="chat-fab" onClick={() => setOpen(true)} title="Ouvrir le chat Orchestra">
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-title">
          <MessageCircle size={16} />
          <span>Orchestra AI</span>
        </div>
        <button className="chat-close" onClick={() => setOpen(false)}><X size={16} /></button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {!messages.length && (
          <div className="chat-empty">
            <p>Pose une question sur ta machine ou demande une action.</p>
            <div className="chat-suggestions">
              <button className="button button-ghost" onClick={() => setInput("Optimise ma machine")}>Optimise ma machine</button>
              <button className="button button-ghost" onClick={() => setInput("Pourquoi j'ai des doublons ?")}>Pourquoi des doublons ?</button>
              <button className="button button-ghost" onClick={() => setInput("Quel profil lancer ?")}>Quel profil lancer ?</button>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-content">
              {msg.role === "assistant" ? renderContent(msg.content) : msg.content}
              {streaming && i === messages.length - 1 && msg.role === "assistant" && <Loader size={14} className="chat-spinner" />}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input-bar">
        <input
          className="chat-input"
          placeholder="Demande quelque chose..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          disabled={streaming}
        />
        <button className="chat-send" onClick={() => void handleSend()} disabled={streaming || !input.trim()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
