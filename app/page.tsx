import { redirect } from "next/navigation";
import { getCampProfile, getKeyGrid, listBookings, listEvisitor, listNotes, listParcels, listParcelTypes } from "@/lib/data";
import { currentCampId } from "@/lib/session";
import Dashboard from "@/components/Dashboard";
import type { ParcelVM, TypeVM } from "@/lib/types";

// Always read fresh data (mutations call router.refresh()).
export const dynamic = "force-dynamic";

export default async function Page() {
  const campId = await currentCampId();
  if (!campId) redirect("/login");

  // New camps must finish onboarding before reaching the dashboard.
  const profile = await getCampProfile(campId);
  if (!profile.onboardedAt) redirect("/onboarding");

  const [bookings, parcels, types, notes, keyGrid, evisitor] = await Promise.all([
    listBookings(campId),
    listParcels(campId),
    listParcelTypes(campId),
    listNotes(campId),
    getKeyGrid(campId),
    listEvisitor(campId),
  ]);

  const typeVMs: TypeVM[] = types.map((t) => ({ id: t.id, name: t.name, order: t.order }));
  const parcelVMs: ParcelVM[] = parcels.map((p) => ({
    id: p.id,
    label: p.label,
    typeId: p.typeId,
    typeName: p.type.name,
    capacity: p.capacity,
    order: p.order,
  }));

  return (
    <Dashboard
      initialBookings={bookings}
      initialParcels={parcelVMs}
      initialTypes={typeVMs}
      initialNotes={notes}
      initialKeyGrid={keyGrid}
      initialEvisitor={evisitor}
      unitNoun={profile.unitNoun}
    />
  );
}
