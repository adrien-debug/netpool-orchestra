import type { AIProvider, ChatMessage, ChatOptions, ChatResponse } from "./provider.js";

export class AIRouter {
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

  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

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

export const aiRouter = new AIRouter();
