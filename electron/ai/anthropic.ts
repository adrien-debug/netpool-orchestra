import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, ToolCall } from "./provider.js";

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly name = "Anthropic";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  setApiKey(key: string) { this.apiKey = key; }

  async available(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  private formatMessages(messages: ChatMessage[]) {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "tool" ? "user" as const : m.role as "user" | "assistant",
        content: m.role === "tool"
          ? `[Tool result for ${m.name ?? m.toolCallId}]: ${m.content}`
          : m.content
      }));
  }

  private extractSystemPrompt(messages: ChatMessage[], options?: ChatOptions): string | undefined {
    const explicit = options?.systemPrompt;
    const fromMessages = messages.find((m) => m.role === "system")?.content;
    return explicit ?? fromMessages;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const system = this.extractSystemPrompt(messages, options);
    const body: Record<string, unknown> = {
      model: options?.model ?? "claude-sonnet-4-20250514",
      max_tokens: options?.maxTokens ?? 2048,
      messages: this.formatMessages(messages)
    };
    if (system) body.system = system;
    if (options?.tools?.length) {
      body.tools = options.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters
      }));
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as {
      content: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[];
      stop_reason: string;
    };

    const textParts = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "");
    const toolCalls: ToolCall[] = data.content
      .filter((c) => c.type === "tool_use")
      .map((c) => ({ id: c.id!, name: c.name!, arguments: c.input ?? {} }));

    return {
      content: textParts.join(""),
      toolCalls: toolCalls.length ? toolCalls : undefined,
      finishReason: data.stop_reason === "tool_use" ? "tool_calls" : "stop"
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const system = this.extractSystemPrompt(messages, options);
    const body: Record<string, unknown> = {
      model: options?.model ?? "claude-sonnet-4-20250514",
      max_tokens: options?.maxTokens ?? 2048,
      messages: this.formatMessages(messages),
      stream: true
    };
    if (system) body.system = system;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok || !res.body) throw new Error(`Anthropic stream error ${res.status}`);

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
        if (!line.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(line.slice(6)) as { type: string; delta?: { type: string; text?: string } };
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch { /* skip */ }
      }
    }
  }
}
