import { describe, it, expect, vi, beforeEach } from "vitest";

interface ChatMessage { role: string; content: string; }
interface ChatResponse { content: string; finishReason: string; toolCalls?: unknown[]; }
interface ChatOptions { systemPrompt?: string; }

interface AIProvider {
  id: string;
  name: string;
  available(): Promise<boolean>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string>;
}

class AIRouter {
  private providers = new Map<string, AIProvider>();
  private _activeId: string | null = null;
  private _fallbackId: string | null = null;

  register(provider: AIProvider) {
    this.providers.set(provider.id, provider);
    if (!this._activeId) this._activeId = provider.id;
  }

  setActive(providerId: string) {
    if (!this.providers.has(providerId)) throw new Error(`Unknown provider: ${providerId}`);
    this._activeId = providerId;
  }

  setFallback(providerId: string) {
    this._fallbackId = providerId;
  }

  get activeId() { return this._activeId; }

  listProviders() {
    return Array.from(this.providers.values()).map((p) => ({ id: p.id, name: p.name }));
  }

  private async resolveProvider(): Promise<AIProvider> {
    if (this._activeId) {
      const primary = this.providers.get(this._activeId);
      if (primary && await primary.available()) return primary;
    }
    if (this._fallbackId) {
      const fallback = this.providers.get(this._fallbackId);
      if (fallback && await fallback.available()) return fallback;
    }
    for (const p of this.providers.values()) {
      if (await p.available()) return p;
    }
    throw new Error("No AI provider available. Configure an API key in Settings.");
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const provider = await this.resolveProvider();
    return provider.chat(messages, options);
  }

  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<string> {
    const provider = await this.resolveProvider();
    yield* provider.chatStream(messages, options);
  }
}

function createMockProvider(id: string, name: string, isAvailable = true): AIProvider {
  return {
    id,
    name,
    available: vi.fn(async () => isAvailable),
    chat: vi.fn(async () => ({ content: `Response from ${id}`, finishReason: "stop" })),
    chatStream: vi.fn(async function* () { yield `chunk from ${id}`; })
  };
}

describe("AIRouter", () => {
  let router: AIRouter;

  beforeEach(() => {
    router = new AIRouter();
  });

  describe("register", () => {
    it("registers a provider and sets it as active by default", () => {
      const p = createMockProvider("openai", "OpenAI");
      router.register(p);
      expect(router.activeId).toBe("openai");
      expect(router.listProviders()).toEqual([{ id: "openai", name: "OpenAI" }]);
    });

    it("first registered provider becomes active", () => {
      router.register(createMockProvider("openai", "OpenAI"));
      router.register(createMockProvider("anthropic", "Anthropic"));
      expect(router.activeId).toBe("openai");
    });
  });

  describe("setActive", () => {
    it("switches active provider", () => {
      router.register(createMockProvider("openai", "OpenAI"));
      router.register(createMockProvider("anthropic", "Anthropic"));
      router.setActive("anthropic");
      expect(router.activeId).toBe("anthropic");
    });

    it("throws for unknown provider", () => {
      expect(() => router.setActive("unknown")).toThrow("Unknown provider");
    });
  });

  describe("chat", () => {
    it("uses active provider", async () => {
      const openai = createMockProvider("openai", "OpenAI");
      router.register(openai);
      const result = await router.chat([{ role: "user", content: "test" }]);
      expect(result.content).toBe("Response from openai");
      expect(openai.chat).toHaveBeenCalled();
    });

    it("falls back when active provider is unavailable", async () => {
      const openai = createMockProvider("openai", "OpenAI", false);
      const ollama = createMockProvider("ollama", "Ollama", true);
      router.register(openai);
      router.register(ollama);
      router.setFallback("ollama");
      const result = await router.chat([{ role: "user", content: "test" }]);
      expect(result.content).toBe("Response from ollama");
    });

    it("throws when no provider is available", async () => {
      router.register(createMockProvider("openai", "OpenAI", false));
      await expect(router.chat([{ role: "user", content: "test" }])).rejects.toThrow("No AI provider available");
    });

    it("tries all providers when active and fallback are unavailable", async () => {
      const a = createMockProvider("a", "A", false);
      const b = createMockProvider("b", "B", false);
      const c = createMockProvider("c", "C", true);
      router.register(a);
      router.register(b);
      router.register(c);
      router.setFallback("b");
      const result = await router.chat([{ role: "user", content: "test" }]);
      expect(result.content).toBe("Response from c");
    });
  });

  describe("chatStream", () => {
    it("streams from active provider", async () => {
      router.register(createMockProvider("openai", "OpenAI"));
      const chunks: string[] = [];
      for await (const chunk of router.chatStream([{ role: "user", content: "test" }])) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual(["chunk from openai"]);
    });
  });

  describe("listProviders", () => {
    it("returns all registered providers", () => {
      router.register(createMockProvider("openai", "OpenAI"));
      router.register(createMockProvider("anthropic", "Anthropic"));
      router.register(createMockProvider("ollama", "Ollama"));
      expect(router.listProviders()).toHaveLength(3);
    });

    it("returns empty array when no providers", () => {
      expect(router.listProviders()).toEqual([]);
    });
  });
});
