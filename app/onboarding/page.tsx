import { redirect } from "next/navigation";
import { getCampProfile } from "@/lib/data";
import { currentCampId } from "@/lib/session";
import Onboarding from "@/components/Onboarding";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const campId = await currentCampId();
  if (!campId) redirect("/login");

  const profile = await getCampProfile(campId);
  // Already set up → nothing to do here. Guards existing camps and re-visits.
  if (profile.onboardedAt) redirect("/");

  return <Onboarding campName={profile.name} />;
}
