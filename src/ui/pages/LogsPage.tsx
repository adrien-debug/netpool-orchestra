import { useAppStore } from "@core/store";
import { LogRow, Section } from "@ui/components";

export function LogsPage() {
  const logs = useAppStore((s) => s.snapshot.logs);
  return (
    <Section
      title="Journal d’activité"
      description="À quoi sert cette page: suivre les actions récentes et les erreurs."
    >
      <div className="stack">
        {logs.map((item) => <LogRow key={item.id} item={item} />)}
      </div>
    </Section>
  );
}
