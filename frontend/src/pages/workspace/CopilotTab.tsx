import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Layers,
  ArrowRight,
} from "lucide-react";
import { api, apiError } from "../../api/client";
import type { TaskDecompositionOut, CopilotChatOut } from "../../types";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/States";

interface CopilotTabProps {
  teamId: string;
  problemTitle?: string;
  isLeader: boolean;
  isMember: boolean;
  onTasksGenerated?: () => Promise<void>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  runId?: string;
  feedbackGiven?: "up" | "down";
}

const QUICK_PROMPTS = [
  "Suggest a 24-hour MVP sprint roadmap for our problem",
  "Design the database schema and REST API endpoints",
  "Give us 3 unique features to impress the hackathon judges",
  "What are the biggest technical risks we should avoid?",
];

export function CopilotTab({
  teamId,
  problemTitle,
  isMember,
  onTasksGenerated,
}: CopilotTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your HackNova AI Sprint Copilot. I can help your team decompose your problem statement into tasks, architect your tech stack, debug ideas, or refine your demo pitch. What are you building today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Decompose tasks state
  const [decomposing, setDecomposing] = useState(false);
  const [decomposeSuccess, setDecomposeSuccess] = useState<string | null>(null);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<TaskDecompositionOut | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || sending) return;

    setChatError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await api.post<CopilotChatOut>(`/ai/teams/${teamId}/copilot-chat`, {
        message: text,
        history: historyPayload,
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.data.reply,
        model: res.data.model,
        runId: res.data.run_id,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatError(apiError(err, "Failed to get AI response. Please try again."));
    } finally {
      setSending(false);
    }
  };

  const handleDecomposeTasks = async () => {
    if (decomposing) return;
    setDecomposing(true);
    setDecomposeError(null);
    setDecomposeSuccess(null);

    try {
      const res = await api.post<TaskDecompositionOut>(
        `/ai/teams/${teamId}/decompose-tasks`,
        { auto_create: true }
      );
      setGeneratedResult(res.data);
      setDecomposeSuccess(
        `Successfully generated and populated ${res.data.tasks_created} tasks onto your Kanban board!`
      );
      if (onTasksGenerated) {
        await onTasksGenerated();
      }
    } catch (err) {
      setDecomposeError(apiError(err, "Failed to auto-generate tasks"));
    } finally {
      setDecomposing(false);
    }
  };

  const handleFeedback = async (msg: ChatMessage, rating: 1 | -1) => {
    if (!msg.runId || msg.feedbackGiven) return;
    try {
      await api.post("/ai/feedback", {
        run_id: msg.runId,
        rating: rating,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, feedbackGiven: rating === 1 ? "up" : "down" } : m
        )
      );
    } catch {
      // Ignore feedback error
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: AI Sprint Copilot Overview */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-surface-card to-canvas p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink">AI Sprint Copilot</h3>
                <Badge tone="primary">Live</Badge>
              </div>
              <p className="mt-0.5 text-xs text-mute">
                Intelligent team assistant powered by Groq LLM. Contextualized to{" "}
                <span className="font-semibold text-ink">
                  {problemTitle || "your hackathon challenge"}
                </span>
                .
              </p>
            </div>
          </div>

          {/* Quick Action: Auto-decompose tasks button */}
          {isMember && (
            <Button
              onClick={handleDecomposeTasks}
              loading={decomposing}
              variant="primary"
              className="gap-2 shrink-0 self-start sm:self-center"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              Auto-Generate Sprint Backlog
            </Button>
          )}
        </div>

        {/* Decompose feedback messages */}
        {decomposeSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{decomposeSuccess}</span>
          </div>
        )}

        {decomposeError && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{decomposeError}</span>
          </div>
        )}
      </div>

      {/* Generated Backlog Preview (if any) */}
      {generatedResult && generatedResult.tasks.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                Generated Sprint Tasks ({generatedResult.tasks.length})
              </h4>
            </div>
            <Badge tone="info">{generatedResult.problem_title}</Badge>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {generatedResult.tasks.map((t, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-line bg-canvas/60 p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-ink truncate">{t.title}</span>
                  <Badge
                    tone={
                      t.priority === "high"
                        ? "danger"
                        : t.priority === "medium"
                        ? "warning"
                        : "neutral"
                    }
                  >
                    {t.priority}
                  </Badge>
                </div>
                <p className="text-mute line-clamp-2">{t.description}</p>
                <div className="text-[10px] font-semibold text-primary uppercase">
                  {t.category}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Chat Interface */}
      <Card className="flex flex-col h-[560px] overflow-hidden p-0 border border-line">
        {/* Chat Messages Log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`max-w-[80%] space-y-1.5 ${isUser ? "items-end" : ""}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                      isUser
                        ? "bg-primary text-white rounded-tr-none"
                        : "bg-surface-elevated text-ink border border-line rounded-tl-none"
                    }`}
                  >
                    {m.content}
                  </div>

                  {!isUser && m.id !== "welcome" && (
                    <div className="flex items-center gap-3 px-1 text-[11px] text-mute">
                      {m.model && (
                        <span className="text-[10px] uppercase font-mono opacity-60">
                          {m.model.split("/").pop()}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleFeedback(m, 1)}
                          disabled={Boolean(m.feedbackGiven)}
                          className={`p-1 rounded hover:bg-canvas transition ${
                            m.feedbackGiven === "up" ? "text-emerald-500 font-bold" : ""
                          }`}
                          title="Helpful"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(m, -1)}
                          disabled={Boolean(m.feedbackGiven)}
                          className={`p-1 rounded hover:bg-canvas transition ${
                            m.feedbackGiven === "down" ? "text-rose-500 font-bold" : ""
                          }`}
                          title="Unhelpful"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated text-mute border border-line">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })}

          {sending && (
            <div className="flex gap-3 justify-start items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-4 w-4 animate-pulse" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-surface-elevated border border-line px-4 py-2.5 text-xs text-mute flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                <span>Copilot is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="border-t border-line/60 bg-canvas/40 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-mute shrink-0">Quick prompts:</span>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={sending}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-card px-2.5 py-1 text-[11px] font-medium text-mute hover:border-primary hover:text-primary transition whitespace-nowrap"
            >
              <span>{prompt}</span>
              <ArrowRight className="h-2.5 w-2.5 opacity-60" />
            </button>
          ))}
        </div>

        {/* Error notification */}
        {chatError && (
          <div className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{chatError}</span>
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="border-t border-line bg-surface-card p-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI copilot anything about your project, architecture, code, or pitch..."
            disabled={sending || !isMember}
            className="flex-1 bg-transparent px-3 py-2 text-xs text-ink placeholder:text-mute focus:outline-none"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || sending || !isMember}
            className="px-3 py-2 gap-1.5 text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </Button>
        </form>
      </Card>
    </div>
  );
}
