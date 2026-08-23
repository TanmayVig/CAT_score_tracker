import { Send, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { sendChatMessage, type ChatMessage } from "../api";
import { PanelTitle, type PageHandle } from "../components/PageScaffold";

type ChatPageProps = {
  onStatusChange: (handle: PageHandle) => void;
};

const starterPrompts = [
  "What should I focus on this week based on my mocks and small tests?",
  "Analyse my section-wise gaps and suggest a CAT 2026 strategy.",
  "Which topics are becoming strengths and which need immediate revision?",
];

export function ChatPage({ onStatusChange }: ChatPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onStatusChange({
      refresh: async () => {},
      loading,
      exportDisabled: true,
    });
  }, [loading, onStatusChange]);

  async function submitMessage(event?: FormEvent<HTMLFormElement>, overrideMessage?: string) {
    event?.preventDefault();

    const content = (overrideMessage ?? draft).trim();
    if (!content || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);
    setError("");

    try {
      const response = await sendChatMessage(nextMessages);
      setMessages([...nextMessages, response.message]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Hermes could not answer right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat-layout">
      <article className="panel chat-panel">
        <PanelTitle
          eyebrow="Hermes chat"
          title="CAT 2026 prep assistant"
          meta={<p className="chat-subtitle">Hermes receives your mock scores, percentiles, gaps, learnings, small tests, and analysis status as context for every answer.</p>}
          icon={<Sparkles aria-hidden="true" size={22} />}
        />

        {error ? <div className="alert">{error}</div> : null}

        <div className="starter-prompts">
          {starterPrompts.map((prompt) => (
            <button type="button" className="ghost-button small" key={prompt} onClick={() => void submitMessage(undefined, prompt)} disabled={loading}>
              {prompt}
            </button>
          ))}
        </div>

        <div className="chat-transcript" aria-live="polite">
          {messages.length === 0 ? (
            <div className="empty-chat-state">
              Ask Hermes about strategy, weak areas, revision planning, or how your CAT prep is trending.
            </div>
          ) : (
            messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === "user" ? "You" : "Hermes"}</span>
                <p>{message.content}</p>
              </div>
            ))
          )}
          {loading ? (
            <div className="chat-message assistant">
              <span>Hermes</span>
              <p>Thinking with your tracker context...</p>
            </div>
          ) : null}
        </div>

        <form className="chat-composer" onSubmit={(event) => void submitMessage(event)}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask Hermes what to improve next..."
            rows={3}
          />
          <button className="primary-button" type="submit" disabled={loading || draft.trim().length === 0}>
            <Send aria-hidden="true" size={18} />
            Send
          </button>
        </form>
      </article>

      <aside className="panel chat-help-panel">
        <PanelTitle eyebrow="Connection" title="Local Hermes proxy" />
        <p className="muted">
          The server sends your question plus tracker context to Hermes from the backend. Defaults are Ollama-compatible:
        </p>
        <div className="connection-list">
          <span>HERMES_API_URL</span>
          <strong>http://127.0.0.1:11434/api/chat</strong>
          <span>HERMES_MODEL</span>
          <strong>llama3.2:3b</strong>
          <span>HERMES_API_STYLE</span>
          <strong>ollama or openai</strong>
        </div>
      </aside>
    </section>
  );
}
