import { useAppStore } from "@core/store";
import { DockerRow, EmptyState, Section } from "@ui/components";

export function DockerPage() {
  const docker = useAppStore((s) => s.snapshot.docker);
  return (
    <Section
      title="Conteneurs Docker"
      description="À quoi sert cette page: voir l'état des conteneurs locaux."
    >
      {docker.length ? (
        <div className="stack">
          {docker.map((item) => <DockerRow key={item.id} item={item} />)}
        </div>
      ) : (
        <EmptyState message="Aucun conteneur Docker en cours d'exécution." />
      )}
    </Section>
  );
}
