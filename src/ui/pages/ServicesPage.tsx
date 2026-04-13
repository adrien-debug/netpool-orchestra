import { useAppStore } from "@core/store";
import { EmptyState, Section, ServiceRow } from "@ui/components";

export function ServicesPage() {
  const services = useAppStore((s) => s.snapshot.services);
  return (
    <Section
      title="Services gérés"
      description="À quoi sert cette page: piloter chaque service et voir son état réel."
    >
      {services.length ? (
        <div className="stack">
          {services.map((item) => <ServiceRow key={item.id} item={item} />)}
        </div>
      ) : (
        <EmptyState message="Aucun service détecté. Lance un scan pour actualiser." />
      )}
    </Section>
  );
}
