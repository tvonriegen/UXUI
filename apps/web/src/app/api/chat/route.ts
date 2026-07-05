// ──────────────────────────────────────────────────────────────────
// /api/chat — Context-Aware Agentic Chatbot  (Epic 3)
// ──────────────────────────────────────────────────────────────────
// Available to: Empresa (company queries) and Colegio (school queries)
// Uses claude-sonnet-4-6 with prompt caching + streaming + tool use.
// Authorization is enforced server-side: every tool call is scoped to
// the authenticated user's own data.
// ──────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { createServerSupabaseClient, createAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Feature flag: set ENABLE_AI_CHAT=true in .env.local to activate ─
// The chatbot makes paid API calls to Anthropic. Leave this unset (or
// set to anything other than "true") to keep the endpoint disabled.
const CHAT_ENABLED = process.env.ENABLE_AI_CHAT === "true";

// ── Anthropic client (singleton across warm invocations) ──────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── System prompts (cached) ───────────────────────────────────────

const COMPANY_SYSTEM = `Eres un asistente inteligente para empresas que usan ClassLink, una plataforma de conexión con talento técnico.

Ayudas al equipo de RRHH a explorar candidatos, revisar postulaciones y gestionar vacantes con herramientas específicas que puedes llamar.

Directrices:
- Sólo puedes consultar datos de la empresa autenticada (tus vacantes, tus postulantes).
- Nunca reveles datos de otras empresas ni de estudiantes no relacionados con tus vacantes.
- Si te piden datos fuera de tu alcance, explica claramente que no tienes acceso.
- Responde en español, de forma concisa y profesional.
- Cuando uses una herramienta, interpreta los resultados y présenta un resumen claro.`;

const SCHOOL_SYSTEM = `Eres un asistente inteligente para colegios técnico-profesionales que usan ClassLink para gestionar y conectar a sus estudiantes con oportunidades laborales.

Ayudas al equipo directivo a consultar el estado de sus estudiantes, solicitudes de prácticas y datos académicos.

Directrices:
- Sólo puedes consultar datos de los estudiantes y solicitudes asociados a tu colegio.
- Nunca reveles datos de estudiantes de otros colegios.
- Si te piden datos fuera de tu alcance, explica claramente que no tienes acceso.
- Responde en español, de forma concisa y profesional.
- Cuando uses una herramienta, interpreta los resultados y presenta un resumen claro.`;

// ── Tool definitions ──────────────────────────────────────────────

const COMPANY_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_job_postings",
    description: "Lista todas las vacantes publicadas por esta empresa. Devuelve título, tipo, estado (abierta/cerrada), cupos y fecha.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_applicants",
    description: "Lista los postulantes de una vacante específica. Devuelve nombre, email, estado de la postulación y fecha.",
    input_schema: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "UUID de la vacante" },
      },
      required: ["job_id"],
    },
  },
  {
    name: "get_applicant_profile",
    description: "Obtiene el perfil público de un postulante (nombre, especialidad, nivel, XP, habilidades) — sólo si postuló a alguna vacante de esta empresa.",
    input_schema: {
      type: "object",
      properties: {
        applicant_id: { type: "string", description: "UUID del postulante" },
      },
      required: ["applicant_id"],
    },
  },
  {
    name: "get_application_stats",
    description: "Devuelve estadísticas globales: total de postulaciones, distribución por estado y las 5 vacantes más activas.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

const SCHOOL_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_students",
    description: "Lista todos los estudiantes activos del colegio. Devuelve nombre, especialidad, clase, disponibilidad y reputación.",
    input_schema: {
      type: "object",
      properties: {
        specialty: { type: "string", description: "Filtrar por especialidad (opcional)" },
        available_only: { type: "boolean", description: "Mostrar sólo estudiantes disponibles" },
      },
      required: [],
    },
  },
  {
    name: "get_student_profile",
    description: "Obtiene el perfil completo de un estudiante del colegio: datos personales, habilidades, historial académico y postulaciones.",
    input_schema: {
      type: "object",
      properties: {
        student_id: { type: "string", description: "UUID del estudiante" },
      },
      required: ["student_id"],
    },
  },
  {
    name: "list_internship_requests",
    description: "Lista las solicitudes de prácticas recibidas de empresas para este colegio. Devuelve empresa, descripción, estado y urgencia.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

// ── Tool executors ────────────────────────────────────────────────

async function runCompanyTool(
  toolName: string,
  input: Record<string, unknown>,
  companyId: string
): Promise<string> {
  const admin = createAdminClient();

  if (toolName === "list_job_postings") {
    const { data, error } = await admin
      .from("job_postings")
      .select("id, title, type, active, slots, created_at, max_candidates")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return `Error al consultar vacantes: ${error.message}`;
    if (!data?.length) return "Esta empresa no tiene vacantes publicadas.";
    return JSON.stringify(data, null, 2);
  }

  if (toolName === "list_applicants") {
    const jobId = String(input.job_id ?? "");
    if (!jobId) return "Se requiere el ID de la vacante.";
    // Verify the job belongs to this company
    const { data: job } = await admin
      .from("job_postings")
      .select("id")
      .eq("id", jobId)
      .eq("company_id", companyId)
      .single();
    if (!job) return "Vacante no encontrada o no pertenece a esta empresa.";

    const { data, error } = await admin
      .from("job_applications")
      .select("id, status, created_at, profiles!job_applications_applicant_id_fkey(name, email, specialty)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return `Error al consultar postulantes: ${error.message}`;
    if (!data?.length) return "Esta vacante no tiene postulantes todavía.";
    return JSON.stringify(data, null, 2);
  }

  if (toolName === "get_applicant_profile") {
    const applicantId = String(input.applicant_id ?? "");
    if (!applicantId) return "Se requiere el ID del postulante.";
    // Verify this applicant applied to one of this company's jobs
    const { data: application } = await admin
      .from("job_applications")
      .select("id, job_postings!inner(company_id)")
      .eq("applicant_id", applicantId)
      .eq("job_postings.company_id", companyId)
      .limit(1)
      .single();
    if (!application) return "Este postulante no ha aplicado a ninguna vacante de tu empresa.";

    const { data, error } = await admin
      .from("profiles")
      .select("name, email, specialty, title, xp, level, availability, bio, location, reputation_score")
      .eq("id", applicantId)
      .single();
    if (error || !data) return "Perfil no encontrado.";

    const { data: skills } = await admin
      .from("user_skills")
      .select("skills!user_skills_skill_id_fkey(name, category)")
      .eq("user_id", applicantId);

    return JSON.stringify({ profile: data, skills: skills ?? [] }, null, 2);
  }

  if (toolName === "get_application_stats") {
    const { data: jobs } = await admin
      .from("job_postings")
      .select("id, title")
      .eq("company_id", companyId);
    if (!jobs?.length) return "Esta empresa no tiene vacantes.";

    const jobIds = jobs.map((j) => j.id);
    const { data: apps } = await admin
      .from("job_applications")
      .select("id, status, job_id")
      .in("job_id", jobIds);

    const total = apps?.length ?? 0;
    const byStatus: Record<string, number> = {};
    const byJob: Record<string, number> = {};
    (apps ?? []).forEach((a) => {
      byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
      byJob[a.job_id] = (byJob[a.job_id] ?? 0) + 1;
    });

    const topJobs = Object.entries(byJob)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([jobId, count]) => ({
        job: jobs.find((j) => j.id === jobId)?.title ?? jobId,
        count,
      }));

    return JSON.stringify({ total, by_status: byStatus, top_jobs: topJobs }, null, 2);
  }

  return `Herramienta desconocida: ${toolName}`;
}

async function runSchoolTool(
  toolName: string,
  input: Record<string, unknown>,
  schoolId: string
): Promise<string> {
  const admin = createAdminClient();

  if (toolName === "list_students") {
    let query = admin
      .from("profiles")
      .select("id, name, specialty, class_name, availability, reputation_score, age, gender")
      .eq("school_id", schoolId)
      .eq("role", "Estudiante")
      .order("name");

    if (input.specialty) query = query.eq("specialty", String(input.specialty));
    if (input.available_only) query = query.eq("availability", "Disponible");

    const { data, error } = await query.limit(100);
    if (error) return `Error al consultar estudiantes: ${error.message}`;
    if (!data?.length) return "No se encontraron estudiantes con esos filtros.";
    return JSON.stringify(data, null, 2);
  }

  if (toolName === "get_student_profile") {
    const studentId = String(input.student_id ?? "");
    if (!studentId) return "Se requiere el ID del estudiante.";

    // Verify student belongs to this school
    const { data: student, error } = await admin
      .from("profiles")
      .select("id, name, email, rut, gender, cellphone, class_name, age, specialty, grade, attendance, availability, xp, level, reputation_score, bio")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .eq("role", "Estudiante")
      .single();

    if (error || !student) return "Estudiante no encontrado o no pertenece a este colegio.";

    const [{ data: skills }, { data: apps }] = await Promise.all([
      admin
        .from("user_skills")
        .select("skills!user_skills_skill_id_fkey(name, category)")
        .eq("user_id", studentId),
      admin
        .from("job_applications")
        .select("status, job_postings!inner(title, type)")
        .eq("applicant_id", studentId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return JSON.stringify({ student, skills: skills ?? [], applications: apps ?? [] }, null, 2);
  }

  if (toolName === "list_internship_requests") {
    const { data, error } = await admin
      .from("internship_requests")
      .select("id, title, description, specialty, slots, status, urgent, created_at, profiles!internship_requests_company_id_fkey(name, company_name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return `Error al consultar solicitudes: ${error.message}`;
    if (!data?.length) return "No hay solicitudes de práctica para este colegio.";
    return JSON.stringify(data, null, 2);
  }

  return `Herramienta desconocida: ${toolName}`;
}

// ── Route handler ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!CHAT_ENABLED) {
    return NextResponse.json(
      { error: "El asistente IA no está habilitado en este entorno." },
      { status: 503 }
    );
  }

  // 1. Authenticate
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // 2. Load profile + role
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role, name, company_name, school_name")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "Perfil no encontrado." }, { status: 403 });
  }

  const { role } = profile;
  if (role !== "Empresa" && role !== "Colegio") {
    return NextResponse.json({ error: "El chatbot sólo está disponible para Empresa y Colegio." }, { status: 403 });
  }

  // 3. Parse request body
  let messages: Anthropic.MessageParam[];
  try {
    const body = await request.json();
    messages = body.messages ?? [];
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Se requiere al menos un mensaje." }, { status: 400 });
    }
    // Limit history depth to prevent token bloat
    if (messages.length > 30) messages = messages.slice(-30);
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  // 4. Select system prompt + tools based on role
  const systemText = role === "Empresa" ? COMPANY_SYSTEM : SCHOOL_SYSTEM;
  const tools = role === "Empresa" ? COMPANY_TOOLS : SCHOOL_TOOLS;
  const orgId = profile.id;

  // 5. Stream response with agentic tool loop
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) =>
        controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));

      try {
        let currentMessages = [...messages];
        let iterations = 0;
        const MAX_ITERATIONS = 5; // prevent runaway loops

        while (iterations < MAX_ITERATIONS) {
          iterations++;

          // Call Claude with prompt caching on the system prompt
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 2048,
            system: [
              {
                type: "text",
                text: systemText,
                // Prompt caching: system prompt is stable per role, so this
                // breakpoint pays for itself after the first request.
                cache_control: { type: "ephemeral" } as Anthropic.CacheControlEphemeral,
              },
            ],
            tools,
            messages: currentMessages,
            stream: true,
          });

          // Collect full response while streaming text deltas to the client.
          // We use the param types (not response types) because we're building
          // the next request's message history.
          type AssistantBlock = Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam;
          let stopReason: string | null = null;
          const assistantBlocks: AssistantBlock[] = [];
          let currentType: "text" | "tool_use" | null = null;
          let currentToolId = "";
          let currentToolName = "";
          let currentBlockText = "";
          let currentToolInput = "";

          for await (const event of response) {
            if (event.type === "content_block_start") {
              currentType = event.content_block.type as "text" | "tool_use";
              currentBlockText = "";
              currentToolInput = "";
              if (event.content_block.type === "tool_use") {
                currentToolId   = event.content_block.id;
                currentToolName = event.content_block.name;
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                currentBlockText += event.delta.text;
                send(JSON.stringify({ type: "text", text: event.delta.text }));
              } else if (event.delta.type === "input_json_delta") {
                currentToolInput += event.delta.partial_json;
              }
            } else if (event.type === "content_block_stop" && currentType) {
              if (currentType === "text") {
                assistantBlocks.push({ type: "text", text: currentBlockText });
              } else if (currentType === "tool_use") {
                let parsedInput: Record<string, unknown> = {};
                try { parsedInput = JSON.parse(currentToolInput || "{}"); } catch { /* keep empty */ }
                assistantBlocks.push({
                  type:  "tool_use",
                  id:    currentToolId,
                  name:  currentToolName,
                  input: parsedInput,
                });
              }
              currentType = null;
            } else if (event.type === "message_delta") {
              stopReason = event.delta.stop_reason ?? null;
            }
          }

          // Append assistant turn to history
          currentMessages = [
            ...currentMessages,
            { role: "assistant", content: assistantBlocks },
          ];

          if (stopReason !== "tool_use") break;

          // Execute tool calls
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of assistantBlocks) {
            if (block.type !== "tool_use") continue;
            const toolBlock = block as Anthropic.ToolUseBlockParam;
            send(JSON.stringify({ type: "tool_call", tool: toolBlock.name }));

            let result: string;
            try {
              const toolInput = (toolBlock.input as Record<string, unknown>) ?? {};
              result = role === "Empresa"
                ? await runCompanyTool(toolBlock.name, toolInput, orgId)
                : await runSchoolTool(toolBlock.name, toolInput, orgId);
            } catch {
              result = `Error al ejecutar la herramienta ${toolBlock.name}.`;
            }

            toolResults.push({ type: "tool_result", tool_use_id: toolBlock.id, content: result });
          }

          currentMessages = [...currentMessages, { role: "user", content: toolResults }];
        }

        send("[DONE]");
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error interno del servidor.";
        send(JSON.stringify({ type: "error", message: msg }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
