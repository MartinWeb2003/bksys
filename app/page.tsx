import { redirect } from "next/navigation";
import { listBookings, listParcels, listParcelTypes } from "@/lib/data";
import { currentCampId } from "@/lib/session";
import Dashboard from "@/components/Dashboard";
import type { ParcelVM, TypeVM } from "@/lib/types";

// Always read fresh data (mutations call router.refresh()).
export const dynamic = "force-dynamic";

export default async function Page() {
  const campId = await currentCampId();
  if (!campId) redirect("/login");

  const [bookings, parcels, types] = await Promise.all([listBookings(campId), listParcels(campId), listParcelTypes(campId)]);

  const typeVMs: TypeVM[] = types.map((t) => ({ id: t.id, name: t.name, order: t.order }));
  const parcelVMs: ParcelVM[] = parcels.map((p) => ({
    id: p.id,
    label: p.label,
    typeId: p.typeId,
    typeName: p.type.name,
    capacity: p.capacity,
    order: p.order,
  }));

  return <Dashboard initialBookings={bookings} initialParcels={parcelVMs} initialTypes={typeVMs} />;
}
