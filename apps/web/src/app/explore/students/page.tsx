import Link from "next/link";
import PublicShell from "@/components/layout/PublicShell";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";

interface PublicStudent {
  id: string;
  name: string;
  avatar: string | null;
  specialty: string;
  bio: string;
  school_name: string | null;
}

async function loadStudents(): Promise<PublicStudent[]> {
  const cookieStore = await cookies();
  const supabase = createServerSupabaseClient(cookieStore as any); // eslint-disable-line
  const { data } = await supabase
    .from("public_student_profiles")
    .select("id, name, avatar, specialty, bio, school_name")
    .order("name")
    .limit(24);
  return (data ?? []) as PublicStudent[];
}

export default async function ExploreStudentsPage() {
  const students = await loadStudents();
  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <Link href="/explore" className="text-sm font-bold text-sky-700 hover:text-sky-800">Volver a explorar</Link>
        <div className="mt-8 animate-fade-in-up">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">Talento público</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Estudiantes visibles públicamente</h1>
          <p className="mt-3 text-slate-500">Solo se muestran campos autorizados por cada estudiante.</p>
        </div>
        {students.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Aún no hay perfiles públicos disponibles.</div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student, index) => (
              <Link key={student.id} href={`/explore/students/${student.id}`} className={`rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-md animate-fade-in-up stagger-${Math.min(index + 1, 6)}`}>
                <div className="flex items-center gap-4">
                  {student.avatar ? <img src={student.avatar} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-50 text-lg font-extrabold text-sky-500">{student.name.charAt(0).toUpperCase()}</div>}
                  <div><h2 className="font-bold text-slate-900">{student.name}</h2><p className="text-sm text-sky-700">{student.specialty || "Especialidad por definir"}</p></div>
                </div>
                <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-500">{student.bio || "Perfil profesional en construcción."}</p>
                {student.school_name && <p className="mt-4 text-xs font-semibold text-slate-400">{student.school_name}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </PublicShell>
  );
}
