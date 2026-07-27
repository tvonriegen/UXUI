import Link from "next/link";
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
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/explore" className="text-sm font-bold text-sky-700">Explorar talento</Link>
          <Link href="/login" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold">Ingresar</Link>
        </div>
        <h1 className="mt-14 text-4xl font-black tracking-tight">Estudiantes visibles publicamente</h1>
        <p className="mt-3 text-slate-600">Solo se muestran campos autorizados por cada estudiante.</p>
        {students.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Aun no hay perfiles publicos disponibles.</div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Link key={student.id} href={`/explore/students/${student.id}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="flex items-center gap-4">
                  {student.avatar ? <img src={student.avatar} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="h-14 w-14 rounded-2xl bg-sky-100" />}
                  <div><h2 className="font-bold">{student.name}</h2><p className="text-sm text-sky-700">{student.specialty || "Especialidad por definir"}</p></div>
                </div>
                <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">{student.bio || "Perfil profesional en construccion."}</p>
                {student.school_name && <p className="mt-4 text-xs font-semibold text-slate-400">{student.school_name}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
