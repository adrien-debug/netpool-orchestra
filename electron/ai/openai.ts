import type { AIProvider, ChatMessage, ChatOptions, ChatResponse, ToolCall } from "./provider.js";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  readonly name = "OpenAI";
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.openai.com/v1") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  setApiKey(key: string) { this.apiKey = key; }

  async available(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  private buildBody(messages: ChatMessage[], options?: ChatOptions) {
    const body: Record<string, unknown> = {
      model: options?.model ?? "gpt-4o-mini",
      messages: this.formatMessages(messages, options?.systemPrompt),
      temperature: options?.temperature ?? 0.4,
      max_tokens: options?.maxTokens ?? 2048
    };
    if (options?.tools?.length) {
      body.tools = options.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters }
      }));
    }
    return body;
  }

  private formatMessages(messages: ChatMessage[], systemPrompt?: string) {
    const out: { role: string; content: string; tool_call_id?: string; name?: string }[] = [];
    if (systemPrompt) out.push({ role: "system", content: systemPrompt });
    for (const m of messages) {
      const msg: { role: string; content: string; tool_call_id?: string; name?: string } = { role: m.role, content: m.content };
      if (m.toolCallId) msg.tool_call_id = m.toolCallId;
      if (m.name) msg.name = m.name;
      out.push(msg);
    }
    return out;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(this.buildBody(messages, options))
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json() as {
      choices: { message: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] }; finish_reason: string }[]
    };

    const choice = data.choices[0];
    const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>
    }));

    return {
      content: choice.message.content ?? "",
      toolCalls: toolCalls.length ? toolCalls : undefined,
      finishReason: choice.finish_reason === "tool_calls" ? "tool_calls" : choice.finish_reason === "length" ? "length" : "stop"
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const body = { ...this.buildBody(messages, options), stream: true };
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body)
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI stream error ${res.status}`);
    }

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
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const parsed = JSON.parse(line.slice(6)) as { choices: { delta: { content?: string } }[] };
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch { /* skip malformed */ }
      }
    }
  }
}
