"use client";

import { WishlistBoard } from "@/components/dashboard/WishlistBoard";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";

export default function ComprasPage() {
  return (
    <div className="space-y-6 min-w-0">
      <DashboardPageHeader
        eyebrow="Decisiones"
        title="Compras"
        description="Añade lo que te tienta, mira el precio de frente y arrástralo al plazo en el que de verdad podrías permitírtelo."
      />
      <WishlistBoard />
    </div>
  );
}
