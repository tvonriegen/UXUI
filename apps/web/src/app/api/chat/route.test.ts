import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  it("returns unavailable without invoking an AI provider", async () => {
    const response = await POST();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "El asistente IA no está disponible en este release.",
    });
  });
});
