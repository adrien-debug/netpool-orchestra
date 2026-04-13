import type { AIProvider, ChatMessage, ChatOptions, ChatResponse } from "./provider.js";

export class OllamaProvider implements AIProvider {
  readonly id = "ollama";
  readonly name = "Ollama (Local)";
  private baseUrl: string;

  constructor(baseUrl = "http://localhost:11434") {
    this.baseUrl = baseUrl;
  }

  async available(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private formatMessages(messages: ChatMessage[], systemPrompt?: string) {
    const out: { role: string; content: string }[] = [];
    if (systemPrompt) out.push({ role: "system", content: systemPrompt });
    for (const m of messages) {
      out.push({ role: m.role === "tool" ? "user" : m.role, content: m.content });
    }
    return out;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options?.model ?? "llama3.2",
        messages: this.formatMessages(messages, options?.systemPrompt),
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.4,
          num_predict: options?.maxTokens ?? 2048
        }
      })
    });

    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json() as { message: { content: string } };
    return { content: data.message.content, finishReason: "stop" };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options?.model ?? "llama3.2",
        messages: this.formatMessages(messages, options?.systemPrompt),
        stream: true,
        options: {
          temperature: options?.temperature ?? 0.4,
          num_predict: options?.maxTokens ?? 2048
        }
      })
    });

    if (!res.ok || !res.body) throw new Error(`Ollama stream error ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
          if (parsed.message?.content) yield parsed.message.content;
        } catch { /* skip */ }
      }
    }
  }
}
