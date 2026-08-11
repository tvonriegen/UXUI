import { CheckCircle, Loader2, MessageCircle } from "lucide-react";
import type { ContactedState } from "@/components/contact-routing/types";

interface ContactTalentButtonProps {
  label: string;
  className: string;
  contactedState?: ContactedState;
  isContacting: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function ContactTalentButton({
  label,
  className,
  contactedState,
  isContacting,
  disabled,
  onClick,
}: ContactTalentButtonProps) {
  const hasContacted = Boolean(contactedState);
  // Fail closed until the domain contact RPC is available in staging.
  const temporarilyUnavailable = !hasContacted;

  return (
    <button
      onClick={onClick}
      disabled={disabled || temporarilyUnavailable}
      title={temporarilyUnavailable ? "Contactar no está disponible temporalmente." : undefined}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all btn-press disabled:opacity-50 ${hasContacted ? "bg-emerald-500" : className}`}
    >
      {isContacting ? (
        <Loader2 size={12} className="animate-spin" />
      ) : contactedState === "school" ? (
        <><CheckCircle size={12} /> Pendiente colegio</>
      ) : contactedState === "direct" ? (
        <><CheckCircle size={12} /> Contacto creado</>
      ) : temporarilyUnavailable ? (
        <><MessageCircle size={12} /> Contactar no disponible temporalmente</>
      ) : (
        <><MessageCircle size={12} /> {label}</>
      )}
    </button>
  );
}
