import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/explore/students" className="text-sm font-bold text-sky-700">Volver a estudiantes</Link>
        <article className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {student.avatar ? <img src={student.avatar} alt="" className="h-24 w-24 rounded-3xl object-cover" /> : <div className="h-24 w-24 rounded-3xl bg-sky-100" />}
            <div><p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-600">Perfil publico</p><h1 className="mt-2 text-4xl font-black">{student.name}</h1><p className="mt-2 font-semibold text-slate-600">{student.specialty || "Especialidad por definir"}</p></div>
          </div>
          <p className="mt-10 text-lg leading-8 text-slate-600">{student.bio || "Este estudiante aun esta completando su biografia."}</p>
          <div className="mt-8 flex flex-wrap gap-2 text-sm">
            {student.availability && <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{student.availability}</span>}
            {student.has_verified_evidence && <span className="rounded-full bg-sky-50 px-3 py-1.5 font-semibold text-sky-700">Evidencia verificada</span>}
            {student.school_name && <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">{student.school_name}</span>}
          </div>
          <p className="mt-10 text-xs text-slate-400">Los datos de contacto y la informacion institucional privada no forman parte de este perfil publico.</p>
        </article>
      </div>
    </main>
  );
}
