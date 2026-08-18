import { afterEach, describe, expect, it, vi } from "vitest";
import { AnthropicProvider, OpenAIProvider, computeCostUsd } from "./index.js";

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

function mockFetchOnce(json: unknown) {
  const fn = vi.fn(async (_url: string, _init?: RequestInit) => ({
    ok: true,
    status: 200,
    json: async () => json,
    text: async () => JSON.stringify(json),
  }));
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe("AnthropicProvider — contrato", () => {
  it("monta a request e parseia usage/custo", async () => {
    const fn = mockFetchOnce({ content: [{ text: '{"ok":1}' }], usage: { input_tokens: 10, output_tokens: 5 } });
    const r = await new AnthropicProvider("KEY").generate(
      [
        { role: "system", content: "sys" },
        { role: "user", content: "u" },
      ],
      { model: "claude-sonnet-4-6" },
    );
    const call = fn.mock.calls[0]!;
    const url = call[0] as string;
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(init.body as string);

    expect(url).toContain("api.anthropic.com/v1/messages");
    expect(headers["x-api-key"]).toBe("KEY");
    expect(headers["anthropic-version"]).toBeTruthy();
    expect(body.model).toBe("claude-sonnet-4-6");
    expect(body.system).toBe("sys");
    expect(body.messages).toEqual([{ role: "user", content: "u" }]); // system extraído
    expect(r.text).toBe('{"ok":1}');
    expect(r.usage.inputTokens).toBe(10);
    expect(r.usage.costUsd).toBeCloseTo(computeCostUsd("claude-sonnet-4-6", 10, 5));
  });
});

describe("OpenAIProvider — contrato", () => {
  it("monta a request (json mode) e parseia usage/custo", async () => {
    const fn = mockFetchOnce({
      choices: [{ message: { content: '{"ok":2}' } }],
      usage: { prompt_tokens: 20, completion_tokens: 8 },
    });
    const r = await new OpenAIProvider("SK").generate([{ role: "user", content: "oi" }], {
      model: "gpt-5-mini",
      json: true,
    });
    const call = fn.mock.calls[0]!;
    const url = call[0] as string;
    const init = call[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(init.body as string);

    expect(url).toContain("api.openai.com/v1/chat/completions");
    expect(headers["authorization"]).toBe("Bearer SK");
    expect(body.model).toBe("gpt-5-mini");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(r.text).toBe('{"ok":2}');
    expect(r.usage.outputTokens).toBe(8);
    expect(r.usage.costUsd).toBeCloseTo(computeCostUsd("gpt-5-mini", 20, 8));
  });
});
