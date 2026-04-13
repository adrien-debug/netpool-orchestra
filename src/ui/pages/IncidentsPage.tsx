import { useAppStore } from "@core/store";
import { AlertCard, EmptyState, Section } from "@ui/components";

export function IncidentsPage() {
  const alerts = useAppStore((s) => s.snapshot.alerts);
  return (
    <Section
      title="Incidents détectés"
      description="À quoi sert cette page: voir les alertes actives et lancer les actions recommandées."
    >
      {alerts.length ? (
        <div className="stack">
          {alerts.map((item) => <AlertCard key={item.id} item={item} />)}
        </div>
      ) : (
        <EmptyState message="Aucun incident détecté." />
      )}
    </Section>
  );
}
