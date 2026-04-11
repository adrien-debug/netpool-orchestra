import type { CommandAction } from "@shared/types";
import { CommandPalette } from "@ui/components";
import { useAppStore } from "@core/store";
import { Section } from "@ui/components";

export function LauncherPage({ actions }: { actions: CommandAction[] }) {
  const simpleMode = useAppStore((s) => s.simpleMode);
  const filtered = simpleMode
    ? actions.filter((action) => ["doctor", "repair-now", "profile-focus"].includes(action.id))
    : actions;

  return (
    <Section title="Lanceur" description="À quoi sert cette page: lancer des actions rapidement au clavier.">
      <CommandPalette actions={filtered} />
    </Section>
  );
}
