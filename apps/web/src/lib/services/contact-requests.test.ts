import { describe, expect, it, vi } from "vitest";
import { mapContactAuthorization, requestContactWithTalentService } from "@/lib/services/contact-requests";

describe("student contact authorization contract", () => {
  it.each([
    [{ decision: "DENY", contact_request_id: null, conversation_id: null, school_id: null }, { error: "No tienes autorización para contactar este perfil." }],
    [{ decision: "MEDIATED", contact_request_id: "request-1", conversation_id: null, school_id: "school-profile-1" }, { success: true, contactRequestId: "request-1", requiresSchoolApproval: true }],
    [{ decision: "ALLOW", contact_request_id: null, conversation_id: "conversation-1", school_id: null }, { success: true, conversationId: "conversation-1", requiresSchoolApproval: false }],
  ])("maps %j without trusting client authorization fields", (row, expected) => {
    expect(mapContactAuthorization(row as never)).toEqual(expected);
  });

  it.each([
    { decision: "MEDIATED", contact_request_id: null, conversation_id: null, school_id: "school-profile-1" },
    { decision: "ALLOW", contact_request_id: null, conversation_id: null, school_id: null },
  ])("fails closed when %s has no result ID", (row) => {
    expect(mapContactAuthorization(row as never)).toEqual({ error: "No se pudo resolver la autorización de contacto." });
  });

  it("uses the single server-side RPC and forwards only target/message", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ decision: "DENY", contact_request_id: null, conversation_id: null, school_id: null }],
      error: null,
    });
    const supabase = { rpc } as never;

    await requestContactWithTalentService(supabase, { id: "caller-from-session" }, "student-1", "hello");

    expect(rpc).toHaveBeenCalledWith("can_request_student_contact", {
      p_student_id: "student-1",
      p_message: "hello",
    });
  });

  it("fails closed when the RPC returns an error", async () => {
    const supabase = { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("rpc failed") }) } as never;

    await expect(requestContactWithTalentService(supabase, { id: "caller" }, "student-1")).resolves.toEqual({
      error: "No se pudo resolver la autorización de contacto.",
    });
  });

  it("fails closed when the RPC returns no rows", async () => {
    const supabase = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) } as never;

    await expect(requestContactWithTalentService(supabase, { id: "caller" }, "student-1")).resolves.toEqual({
      error: "No tienes autorización para contactar este perfil.",
    });
  });
});
