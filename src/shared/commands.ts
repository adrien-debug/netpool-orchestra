import type { CommandAction } from "./types";

export const commandActions: CommandAction[] = [
  {
    id: "doctor",
    title: "Scanner maintenant",
    subtitle: "Analyse des process, ports, Docker et doublons",
    category: "action",
    risk: "safe",
    shortcut: "Enter",
    runActionId: "doctor"
  },
  {
    id: "repair-now",
    title: "Réparer maintenant",
    subtitle: "Nettoie les doublons, libère les ports sûrs et relance le profil principal",
    category: "action",
    risk: "guided",
    runActionId: "repair-now"
  },
  {
    id: "recovery",
    title: "Récupération (mode avancé)",
    subtitle: "Nettoie les doublons, zombies, ports web secondaires et relance focus",
    category: "action",
    risk: "guided",
    runActionId: "recovery-run"
  },
  {
    id: "clean-duplicates",
    title: "Nettoyer les doublons",
    subtitle: "Arrête les doublons gérés en conservant une instance principale",
    category: "action",
    risk: "guided",
    runActionId: "clean-duplicates"
  },
  {
    id: "clean-zombies",
    title: "Nettoyer les zombies find",
    subtitle: "Arrête les find orphelins anciens",
    category: "action",
    risk: "guided",
    runActionId: "clean-zombies"
  },
  {
    id: "free-port-4000",
    title: "Libérer le port 4000",
    subtitle: "Arrête le process qui écoute sur le port 4000",
    category: "action",
    risk: "guided",
    runActionId: "free-port",
    payload: { port: 4000 }
  },
  {
    id: "profile-focus",
    title: "Lancer le profil focus",
    subtitle: "Démarre les services essentiels et coupe les optionnels lourds",
    category: "profile",
    risk: "safe",
    runActionId: "profile-run",
    payload: { profileId: "focus" }
  },
  {
    id: "goto-services",
    title: "Ouvrir Services",
    subtitle: "Voir tous les services gérés",
    category: "navigation",
    risk: "safe",
    navigateTo: "/services"
  },
  {
    id: "goto-incidents",
    title: "Ouvrir Incidents",
    subtitle: "Voir les problèmes en cours et recommandations",
    category: "navigation",
    risk: "safe",
    navigateTo: "/incidents"
  },
  {
    id: "goto-ports",
    title: "Ouvrir Ports",
    subtitle: "Inspecter les ports et conflits",
    category: "navigation",
    risk: "safe",
    navigateTo: "/ports"
  },
  {
    id: "goto-docker",
    title: "Ouvrir Docker",
    subtitle: "Inspecter les conteneurs en cours",
    category: "navigation",
    risk: "safe",
    navigateTo: "/docker"
  },
  {
    id: "goto-how",
    title: "Ouvrir Comment ça marche",
    subtitle: "Aide rapide sur les actions et statuts",
    category: "navigation",
    risk: "safe",
    navigateTo: "/how-it-works"
  },
  {
    id: "goto-settings",
    title: "Ouvrir Réglages",
    subtitle: "Mode d’affichage, sécurité, fichiers de config",
    category: "navigation",
    risk: "safe",
    navigateTo: "/settings"
  }
];
