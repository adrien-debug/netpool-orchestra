import { useAppStore } from "@core/store";
import { Section, ServiceRow } from "@ui/components";

export function ServicesPage() {
  const services = useAppStore((s) => s.snapshot.services);
  return (
    <Section
      title="Services gérés"
      description="À quoi sert cette page: piloter chaque service et voir son état réel."
    >
      <div className="stack">
        {services.map((item) => <ServiceRow key={item.id} item={item} />)}
      </div>
    </Section>
  );
}
