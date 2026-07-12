import { useState } from "react";
import { requestContactWithTalent } from "@/app/actions/contact-requests";
import type { ContactedState } from "@/components/contact-routing/types";

export function useContactTalent() {
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [contacted, setContacted] = useState<Record<string, ContactedState>>({});
  const [error, setError] = useState<string | null>(null);

  const requestContact = async (talentId: string, message = "") => {
    if (!talentId) return;

    setContactingId(talentId);
    const result = await requestContactWithTalent(talentId, message);

    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setContacted((prev) => ({
        ...prev,
        [talentId]: result.requiresSchoolApproval ? "school" : "direct",
      }));
    }

    setContactingId(null);
    return result;
  };

  return { contactingId, contacted, error, setError, requestContact };
}
