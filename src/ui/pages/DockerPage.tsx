import { useAppStore } from "@core/store";
import { DockerRow, Section } from "@ui/components";

export function DockerPage() {
  const docker = useAppStore((s) => s.snapshot.docker);

  return (
    <Section
      title="Conteneurs Docker"
      description="À quoi sert cette page: voir l’état des conteneurs locaux."
    >
      <div className="stack">
        {docker.length ? docker.map((item) => <DockerRow key={item.id} item={item} />) : <div className="tile">Aucun conteneur en cours.</div>}
      </div>
    </Section>
  );
}
