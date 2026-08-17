import PublicTalentProfilePage from "@/components/talent/PublicTalentProfilePage";

export default function TalentProfileRoute({ params }: { params: { id: string } }) {
  return <PublicTalentProfilePage talentId={params.id} />;
}
