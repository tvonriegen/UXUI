import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import PublicShell from "@/components/layout/PublicShell";

interface Props { params: { id: string } }

export default async function PublicStudentProfilePage({ params }: Props) {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data: student } = await supabase
    .from("public_student_profiles")
    .select("id, name, avatar, specialty, bio, availability, school_name, validated_skills, has_verified_evidence")
    .eq("id", params.id)
    .maybeSingle();

  if (!student) notFound();

  return (
    <PublicShell>
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link href="/explore/students" className="text-sm font-bold text-sky-600 hover:text-sky-700">Volver a estudiantes</Link>
        <article className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {student.avatar ? <img src={student.avatar} alt="" className="h-24 w-24 rounded-2xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-sky-50 text-3xl font-black text-sky-500">{student.name.charAt(0).toUpperCase()}</div>}
            <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-600">Perfil público</p><h1 className="mt-2 text-4xl font-black tracking-tight">{student.name}</h1><p className="mt-2 font-semibold text-slate-500">{student.specialty || "Especialidad por definir"}</p></div>
          </div>
          <p className="mt-10 text-lg leading-8 text-slate-600">{student.bio || "Este estudiante aún está completando su biografía."}</p>
          <div className="mt-8 flex flex-wrap gap-2 text-sm">
            {student.availability && <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{student.availability}</span>}
            {student.has_verified_evidence && <span className="rounded-full bg-sky-50 px-3 py-1.5 font-semibold text-sky-700">Evidencia verificada</span>}
            {student.school_name && <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">{student.school_name}</span>}
          </div>
          <p className="mt-10 border-t border-slate-100 pt-6 text-xs leading-5 text-slate-400">Los datos de contacto y la información institucional privada no forman parte de este perfil público.</p>
        </article>
      </section>
    </PublicShell>
  );
}
