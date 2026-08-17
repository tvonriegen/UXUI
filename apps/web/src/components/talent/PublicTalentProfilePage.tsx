"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, GraduationCap, Loader2, MapPin, Star } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import ContactTalentButton from "@/components/contact-routing/ContactTalentButton";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { useRole } from "@/lib/role-context";
import { useContactTalent } from "@/lib/hooks/useContactTalent";

interface PublicTalentProfile {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  specialty: string | null;
  title: string | null;
  level: number | null;
  availability: string | null;
  years_experience: number | null;
}

export default function PublicTalentProfilePage({ talentId }: { talentId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { role } = useRole();
  const { contactingId, contacted, error: contactError, requestContact } = useContactTalent();
  const [profile, setProfile] = useState<PublicTalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("authenticated_profile_directory")
      .select("id,name,role,avatar,bio,location,specialty,title,level,availability,years_experience")
      .eq("id", talentId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError || !data) setError("El perfil no existe o no está disponible públicamente.");
        else setProfile(data as PublicTalentProfile);
        setLoading(false);
      });
    return () => { active = false; };
  }, [talentId]);

  const handleContact = async () => {
    if (!profile) return;
    const result = await requestContact(profile.id, "Solicitud de contacto desde el perfil de talento.");
    if (result?.success && !result.requiresSchoolApproval && result.conversationId) {
      const route = role === "Empresa" ? "/company/messages" : role === "Colegio" ? "/school/messages" : "/messages";
      router.push(`${route}?conversation=${encodeURIComponent(result.conversationId)}`);
    }
  };

  const backRoute = role === "Empresa" ? "/company/talent" : "/talent";
  const contactedState = contacted[talentId];

  return (
    <PageLayout>
      <main className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-8">
        <Link href={backRoute} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-100">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al directorio
        </Link>

        {loading && <div role="status" className="flex justify-center py-24"><Loader2 className="animate-spin text-sky-500" aria-hidden="true" /><span className="sr-only">Cargando perfil</span></div>}

        {!loading && (error || !profile) && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        )}

        {!loading && profile && (
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-28 bg-gradient-to-r from-sky-500 to-indigo-600" aria-hidden="true" />
            <div className="space-y-6 p-5 md:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={`Foto de ${profile.name}`} className="-mt-14 h-28 w-28 rounded-2xl border-4 border-white object-cover shadow" />
                ) : (
                  <div className="-mt-14 flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-white bg-sky-100 text-4xl font-black text-sky-700 shadow" aria-hidden="true">{profile.name.charAt(0)}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-sky-700">{profile.role}</p>
                  <h1 className="text-2xl font-extrabold text-slate-900 md:text-3xl">{profile.name}</h1>
                  <p className="mt-1 text-slate-600">{profile.title || profile.specialty || "Perfil de talento"}</p>
                </div>
                <ContactTalentButton
                  label={role === "Empresa" ? "Solicitar contacto" : "Contactar"}
                  className={role === "Empresa" ? "bg-violet-600 hover:bg-violet-700" : "bg-sky-600 hover:bg-sky-700"}
                  contactedState={contactedState}
                  isContacting={contactingId === profile.id}
                  disabled={!user || Boolean(contactedState) || contactingId === profile.id}
                  onClick={handleContact}
                />
              </div>

              {(contactError || error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{contactError || error}</p>}

              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {profile.specialty && <div className="rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1 text-xs font-bold text-slate-500"><GraduationCap size={14} /> Especialidad</dt><dd className="mt-1 text-sm text-slate-800">{profile.specialty}</dd></div>}
                {profile.location && <div className="rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1 text-xs font-bold text-slate-500"><MapPin size={14} /> Ubicación</dt><dd className="mt-1 text-sm text-slate-800">{profile.location}</dd></div>}
                <div className="rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1 text-xs font-bold text-slate-500"><Star size={14} /> Nivel</dt><dd className="mt-1 text-sm text-slate-800">{profile.level ?? 1}</dd></div>
                <div className="rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1 text-xs font-bold text-slate-500"><Briefcase size={14} /> Disponibilidad</dt><dd className="mt-1 text-sm text-slate-800">{profile.availability || "No informada"}</dd></div>
              </dl>

              {profile.bio && <section aria-labelledby="talent-about"><h2 id="talent-about" className="text-lg font-bold text-slate-900">Sobre este perfil</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{profile.bio}</p></section>}
            </div>
          </article>
        )}
      </main>
    </PageLayout>
  );
}
