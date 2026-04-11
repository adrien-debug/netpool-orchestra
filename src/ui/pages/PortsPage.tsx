import { useAppStore } from "@core/store";
import { PortRow, Section } from "@ui/components";

export function PortsPage() {
  const ports = useAppStore((s) => s.snapshot.ports);
  return (
    <Section
      title="Ports observés"
      description="À quoi sert cette page: repérer les ports en conflit et libérer les ports gérés."
    >
      <div className="stack">
        {ports.map((item) => <PortRow key={item.id} item={item} />)}
      </div>
    </Section>
  );
}
