// ──────────────────────────────────────────────────────────
// POST /api/seed
// Creates the four ClassLink demo accounts and seeds demo content.
// Safe to call multiple times — existing accounts are reused.
//
// Demo accounts created:
//   Colegio Técnico San José  →  colegio@demo.cr   / Demo1234!
//   Alan García (Estudiante)  →  alan@demo.cr      / Demo1234!
//   Ian Mora    (Estudiante)  →  ian@demo.cr       / Demo1234!
//   Google CR   (Empresa)     →  google@demo.cr    / Demo1234!
// ──────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

const DEMO_PASSWORD = "Demo1234!";

interface DemoUser {
  email: string;
  name:  string;
  role:  string;
}

const DEMO_USERS: DemoUser[] = [
  { email: "colegio@demo.cr", name: "Colegio Técnico San José", role: "Colegio"    },
  { email: "alan@demo.cr",    name: "Alan García",              role: "Estudiante" },
  { email: "ian@demo.cr",     name: "Ian Mora",                 role: "Estudiante" },
  { email: "google@demo.cr",  name: "Google CR",                role: "Empresa"    },
];

export async function POST(request: Request) {
  const log: string[] = [];

  // ── Guard: require x-seed-secret header ───────────────────────────
  // In production, always set SEED_SECRET in your environment variables.
  // Without it this endpoint is open to unauthenticated callers.
  const envSecret = process.env.SEED_SECRET;
  if (envSecret) {
    const provided = request.headers.get("x-seed-secret");
    if (provided !== envSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Validate env vars before doing anything — returns clear JSON on misconfiguration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in Vercel." },
      { status: 500 }
    );
  }

  try {
    const admin = createAdminClient();
    // ── Step 1: Create or find each demo auth user ────────────────
    const uids: Record<string, string> = {};

    for (const demo of DEMO_USERS) {
      // Check if user already exists in profiles (via email)
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("email", demo.email)
        .maybeSingle();

      if (existing?.id) {
        uids[demo.email] = existing.id;
        log.push(`✓ ${demo.email} already exists (${existing.id})`);
        continue;
      }

      // Create auth user — email_confirm: true bypasses confirmation
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email:            demo.email,
        password:         DEMO_PASSWORD,
        email_confirm:    true,
        user_metadata:    { name: demo.name, role: demo.role },
      });

      if (createErr || !created?.user) {
        log.push(`✗ Failed to create ${demo.email}: ${createErr?.message}`);
        continue;
      }

      uids[demo.email] = created.user.id;
      log.push(`✓ Created ${demo.email} (${created.user.id})`);

      // Give the trigger a moment to create the profile row
      await new Promise((r) => setTimeout(r, 300));
    }

    const schoolId  = uids["colegio@demo.cr"];
    const alanId    = uids["alan@demo.cr"];
    const ianId     = uids["ian@demo.cr"];
    const googleId  = uids["google@demo.cr"];

    if (!schoolId || !alanId || !ianId || !googleId) {
      return NextResponse.json({ ok: false, log, error: "One or more accounts could not be created." }, { status: 500 });
    }

    // ── Step 2: Enrich profiles ───────────────────────────────────

    await admin.from("profiles").upsert({
      id:                 schoolId,
      email:              "colegio@demo.cr",
      name:               "Colegio Técnico San José",
      role:               "Colegio",
      school_name:        "Colegio Técnico San José",
      location:           "San José, Costa Rica",
      bio:                "Centro educativo de excelencia técnica con más de 40 años formando profesionales en especialidades técnicas.",
      student_count:      350,
      alliance_count:     3,
      employability_rate: 87.5,
    });
    log.push("✓ School profile enriched");

    await admin.from("profiles").upsert({
      id:               alanId,
      email:            "alan@demo.cr",
      name:             "Alan García",
      role:             "Estudiante",
      school_id:        schoolId,
      specialty:        "Mecatrónica",
      title:            "Técnico en Mecatrónica",
      bio:              "Estudiante apasionado por la robótica y la automatización industrial. Trabajo en proyectos de brazos robóticos y PLC Siemens.",
      location:         "San José, Costa Rica",
      xp:               850,
      level:            5,
      streak:           12,
      gpa:              9.1,
      availability:     "Disponible",
      years_experience: 1,
    });
    log.push("✓ Alan profile enriched");

    await admin.from("profiles").upsert({
      id:               ianId,
      email:            "ian@demo.cr",
      name:             "Ian Mora",
      role:             "Estudiante",
      school_id:        schoolId,
      specialty:        "Electricidad",
      title:            "Técnico en Electricidad",
      bio:              "Especializado en instalaciones eléctricas residenciales e industriales. Experiencia en paneles solares y energías renovables.",
      location:         "Heredia, Costa Rica",
      xp:               420,
      level:            3,
      streak:           7,
      gpa:              8.5,
      availability:     "En prácticas",
      years_experience: 0,
    });
    log.push("✓ Ian profile enriched");

    await admin.from("profiles").upsert({
      id:             googleId,
      email:          "google@demo.cr",
      name:           "Google CR",
      role:           "Empresa",
      company_name:   "Google CR",
      industry:       "Tecnología",
      employee_count: "10,000+",
      website:        "https://careers.google.com",
      bio:            "Oficina de Google en Costa Rica. Buscamos talentos técnicos para unirse a proyectos de impacto global.",
      location:       "Escazú, Costa Rica",
      open_positions: 3,
    });
    log.push("✓ Google profile enriched");

    // ── Step 3: Seed badges ───────────────────────────────────────
    const badgeData = [
      { name: "Primer Paso",      icon: "star",         description: "Completaste tu primer proyecto",    requirement: "Publica tu primer post" },
      { name: "Colaborador",      icon: "users",        description: "Conectaste con 5 personas",         requirement: "10 conexiones" },
      { name: "Experto Técnico",  icon: "cpu",          description: "Dominaste tu especialidad",         requirement: "Nivel 5 o superior" },
      { name: "Racha de Fuego",   icon: "flame",        description: "7 días consecutivos activo",        requirement: "7 días de racha" },
      { name: "Perfil Completo",  icon: "check-circle", description: "Completaste tu perfil al 100%",     requirement: "Llenar todos los campos" },
    ];

    for (const b of badgeData) {
      await admin.from("badges").upsert(b, { onConflict: "name" });
    }
    log.push("✓ Badges upserted");

    // Award some badges to Alan
    const { data: allBadges } = await admin.from("badges").select("id, name");
    if (allBadges) {
      const primeraStep = allBadges.find((b: any) => b.name === "Primer Paso");
      const experto     = allBadges.find((b: any) => b.name === "Experto Técnico");
      const racha       = allBadges.find((b: any) => b.name === "Racha de Fuego");
      const perfil      = allBadges.find((b: any) => b.name === "Perfil Completo");

      for (const badge of [primeraStep, experto, racha, perfil].filter(Boolean)) {
        await admin.from("user_badges").upsert(
          { user_id: alanId, badge_id: (badge as any).id },
          { onConflict: "user_id,badge_id" }
        );
      }

      // Award Ian some badges too
      const primerStepIan = allBadges.find((b: any) => b.name === "Primer Paso");
      const rachaBadgeIan = allBadges.find((b: any) => b.name === "Racha de Fuego");
      for (const badge of [primerStepIan, rachaBadgeIan].filter(Boolean)) {
        await admin.from("user_badges").upsert(
          { user_id: ianId, badge_id: (badge as any).id },
          { onConflict: "user_id,badge_id" }
        );
      }
      log.push("✓ Badges awarded");
    }

    // ── Step 4: Seed posts ────────────────────────────────────────
    const posts = [
      {
        author_id:   alanId,
        title:       "Proyecto de Brazo Robótico con PLC Siemens",
        description: "Desarrollé un brazo robótico de 4 ejes controlado por PLC Siemens S7-1200. El sistema puede clasificar piezas por color usando sensores ópticos.",
        content:     "Desarrollé un brazo robótico de 4 ejes controlado por PLC Siemens S7-1200. El sistema puede clasificar piezas por color usando sensores ópticos. Programado en Ladder y FBD. Gran experiencia en integración de hardware y software industrial.",
        tag:         "Mecatrónica",
        category:    "portafolio",
      },
      {
        author_id:   alanId,
        title:       "Taller de Soldadura TIG — Mi experiencia",
        description: "Participé en el taller avanzado de soldadura TIG del colegio. Aprendí técnicas de unión de acero inoxidable y aluminio.",
        content:     "Participé en el taller avanzado de soldadura TIG del colegio. Aprendí técnicas de unión de acero inoxidable y aluminio. Los resultados superaron mis expectativas y ya tengo mi certificado de nivel básico.",
        tag:         "Soldadura TIG",
        category:    "publicacion",
      },
      {
        author_id:   alanId,
        title:       "Automatización de invernadero con Arduino",
        description: "Sistema de riego automático y control de temperatura para el invernadero del colegio usando Arduino Mega y sensores DHT22.",
        content:     "Sistema de riego automático y control de temperatura para el invernadero del colegio usando Arduino Mega y sensores DHT22. El sistema redujo el consumo de agua en un 40% comparado con el riego manual.",
        tag:         "Mecatrónica",
        category:    "portafolio",
      },
      {
        author_id:   ianId,
        title:       "Instalación de Panel Solar 5kW en Heredia",
        description: "Completé mi primera instalación profesional de un sistema fotovoltaico residencial. 20 paneles de 250W, inversor Fronius.",
        content:     "Completé mi primera instalación profesional de un sistema fotovoltaico residencial. 20 paneles de 250W, inversor Fronius. La familia ahorra un 80% en su factura eléctrica mensual. Proyecto supervisado por mi instructor del colegio.",
        tag:         "Electricidad",
        category:    "portafolio",
      },
      {
        author_id:   ianId,
        title:       "Certificación en Energías Renovables — ¡Lo logré!",
        description: "Obtuve la certificación del INA en instalación de sistemas fotovoltaicos. ¡Muy emocionado por este logro!",
        content:     "Obtuve la certificación del INA en instalación de sistemas fotovoltaicos. ¡Muy emocionado por este logro! Este certificado me abre puertas para trabajar en empresas de energía renovable en Costa Rica.",
        tag:         "Electricidad",
        category:    "publicacion",
      },
      {
        author_id:   ianId,
        title:       "Evento: Feria Técnica 2026 — Colegio Técnico San José",
        description: "La feria técnica anual de nuestro colegio fue un éxito. Más de 500 visitantes, 30 proyectos estudiantiles expuestos.",
        content:     "La feria técnica anual de nuestro colegio fue un éxito. Más de 500 visitantes, 30 proyectos estudiantiles expuestos. Empresas como Google CR y otras 5 compañías asistieron buscando talento. ¡Orgulloso de representar a mi colegio!",
        tag:         "Evento",
        category:    "publicacion",
      },
    ];

    for (const post of posts) {
      const { data: existing } = await admin
        .from("posts")
        .select("id")
        .eq("author_id", post.author_id)
        .eq("title", post.title)
        .maybeSingle();

      if (!existing) {
        await admin.from("posts").insert(post);
      }
    }
    log.push(`✓ ${posts.length} posts seeded`);

    // ── Step 5: Seed job postings ─────────────────────────────────
    const jobs = [
      {
        company_id:  googleId,
        title:       "Técnico en Mecatrónica — Pasantía",
        description: "Buscamos técnicos en mecatrónica para unirse a nuestro equipo de hardware en Costa Rica. Trabajarás en proyectos de automatización y mantenimiento de equipos en nuestros centros de datos.",
        specialty:   "Mecatrónica",
        location:    "Escazú, Costa Rica",
        type:        "pasantia",
        active:      true,
      },
      {
        company_id:  googleId,
        title:       "Técnico Electricista — Tiempo Completo",
        description: "Posición permanente para técnico electricista con experiencia en instalaciones industriales. Requisito: diploma técnico y certificación INA.",
        specialty:   "Electricidad",
        location:    "Escazú, Costa Rica",
        type:        "full-time",
        active:      true,
      },
      {
        company_id:  googleId,
        title:       "Asistente de Mantenimiento Industrial",
        description: "Apoyo en el mantenimiento preventivo y correctivo de infraestructura técnica. Ideal para recién graduados de colegios técnicos.",
        specialty:   "Mecatrónica",
        location:    "Heredia, Costa Rica",
        type:        "part-time",
        active:      true,
      },
    ];

    for (const job of jobs) {
      const { data: existing } = await admin
        .from("job_postings")
        .select("id")
        .eq("company_id", googleId)
        .eq("title", job.title)
        .maybeSingle();

      if (!existing) {
        await admin.from("job_postings").insert(job);
      }
    }
    log.push(`✓ ${jobs.length} job postings seeded`);

    // ── Step 6: Create alliance between Google and the school ─────
    const { data: existingAlliance } = await admin
      .from("alliances")
      .select("id")
      .eq("company_id", googleId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!existingAlliance) {
      await admin.from("alliances").insert({
        company_id: googleId,
        school_id:  schoolId,
        status:     "activa",
      });
      // Update school's alliance count
      await admin.from("profiles").update({ alliance_count: 3 }).eq("id", schoolId);
    }
    log.push("✓ Alliance Google ↔ Colegio created");

    // ── Step 7: Create internship request (Google → School) ───────
    const { data: existingReq } = await admin
      .from("internship_requests")
      .select("id")
      .eq("company_id", googleId)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (!existingReq) {
      await admin.from("internship_requests").insert({
        company_id:  googleId,
        school_id:   schoolId,
        title:       "Pasantías Mecatrónica Q2 2026",
        description: "Solicitud formal de 5 pasantes en el área de mecatrónica para el segundo trimestre del 2026.",
        specialty:   "Mecatrónica",
        slots:       5,
        urgent:      true,
        status:      "pendiente",
      });
    }
    log.push("✓ Internship request seeded");

    // ── Step 8: Send welcome notifications ────────────────────────
    const notifs = [
      {
        user_id: alanId,
        title:   "¡Bienvenido a ClassLink!",
        body:    "Tu cuenta está lista. Explora el muro, conecta con empresas y muestra tu talento.",
        type:    "info",
      },
      {
        user_id: ianId,
        title:   "¡Bienvenido a ClassLink!",
        body:    "Tu cuenta está lista. Revisa las vacantes de Google CR y otras empresas aliadas.",
        type:    "info",
      },
      {
        user_id: schoolId,
        title:   "Nueva solicitud de pasantía",
        body:    "Google CR ha enviado una solicitud urgente de 5 pasantes en Mecatrónica para Q2 2026.",
        type:    "practica",
      },
      {
        user_id: googleId,
        title:   "Alianza activa con Colegio Técnico San José",
        body:    "La alianza con Colegio Técnico San José ha sido confirmada. Ya puedes ver su directorio de talento.",
        type:    "alliance",
      },
      {
        user_id: alanId,
        title:   "Nueva vacante disponible",
        body:    "Google CR publicó una pasantía en Mecatrónica que podría interesarte.",
        type:    "application",
      },
    ];

    for (const notif of notifs) {
      await admin.from("notifications").insert(notif);
    }
    log.push("✓ Notifications sent");

    return NextResponse.json({
      ok:  true,
      log,
      accounts: {
        school:    { email: "colegio@demo.cr",  password: DEMO_PASSWORD, name: "Colegio Técnico San José" },
        student1:  { email: "alan@demo.cr",     password: DEMO_PASSWORD, name: "Alan García"              },
        student2:  { email: "ian@demo.cr",      password: DEMO_PASSWORD, name: "Ian Mora"                 },
        company:   { email: "google@demo.cr",   password: DEMO_PASSWORD, name: "Google CR"                },
      },
    });

  } catch (err: any) {
    return NextResponse.json({ ok: false, log, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
