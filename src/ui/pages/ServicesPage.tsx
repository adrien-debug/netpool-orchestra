import { useAppStore } from "@core/store";
import { EmptyState, Section, ServiceRow } from "@ui/components";
import { VirtualList, useVirtualization } from "@ui/components/VirtualList";

export function ServicesPage() {
  const services = useAppStore((s) => s.snapshot.services);
  const shouldVirtualize = useVirtualization(services.length);

  return (
    <Section
      title="Services gérés"
      description="À quoi sert cette page: piloter chaque service et voir son état réel."
    >
      {services.length ? (
        shouldVirtualize ? (
          <VirtualList
            items={services}
            itemHeight={120}
            containerHeight={600}
            renderItem={(item) => <ServiceRow key={item.id} item={item} />}
          />
        ) : (
          <div className="stack">
            {services.map((item) => <ServiceRow key={item.id} item={item} />)}
          </div>
        )
      ) : (
        <EmptyState message="Aucun service détecté. Lance un scan pour actualiser." />
      )}
    </Section>
  );
}
