import { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  target?: string;
  action?: () => void;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Bienvenue dans Orchestra",
    description: "Orchestra surveille tes processus de dev locaux, détecte les problèmes et propose des actions sécurisées. Ce tour rapide te montre l'essentiel."
  },
  {
    title: "État Global",
    description: "L'Overview affiche l'état de ta machine : services actifs, alertes, métriques CPU/RAM. C'est ton point de départ.",
    target: "overview"
  },
  {
    title: "Scanner Maintenant",
    description: "Ce bouton force un scan complet de ta machine (processus, ports, Docker). Utilise-le pour rafraîchir l'état.",
    target: "scan-button"
  },
  {
    title: "Réparer Maintenant",
    description: "Cette action nettoie les doublons, libère les ports en conflit et relance ton profil principal. C'est l'action la plus utile.",
    target: "repair-button"
  },
  {
    title: "Lanceur Global",
    description: "Appuie sur Cmd+Shift+Space (ou Ctrl+Shift+Space) pour ouvrir une palette d'actions rapide, type Spotlight.",
    target: "launcher-button"
  },
  {
    title: "Chat AI",
    description: "Le bouton en bas à droite ouvre un chat AI. Pose des questions sur ta machine ou demande des actions. Configure tes clés API dans Réglages.",
    target: "chat-fab"
  },
  {
    title: "Mode Simple vs Avancé",
    description: "En mode Simple, seules les pages essentielles sont visibles. En mode Avancé, tu accèdes aux Services, Ports, Docker, Logs. Change dans Réglages.",
    target: "settings"
  },
  {
    title: "C'est parti !",
    description: "Tu es prêt à utiliser Orchestra. Commence par cliquer 'Scanner maintenant' pour voir l'état de ta machine."
  }
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onComplete, 300);
  };

  const step = STEPS[currentStep];

  if (!visible) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <button className="onboarding-close" onClick={handleClose} title="Fermer (Escape)">
          <X size={18} />
        </button>

        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`onboarding-dot ${i === currentStep ? "active" : i < currentStep ? "completed" : ""}`}
            />
          ))}
        </div>

        <h2 className="onboarding-title">{step.title}</h2>
        <p className="onboarding-description">{step.description}</p>

        <div className="onboarding-actions">
          <button
            className="button button-ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={16} />
            Précédent
          </button>

          <span className="onboarding-counter">
            {currentStep + 1} / {STEPS.length}
          </span>

          <button
            className="button button-primary"
            onClick={handleNext}
          >
            {currentStep === STEPS.length - 1 ? "Terminer" : "Suivant"}
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="onboarding-hint">
          Utilise les flèches ← → ou Escape pour naviguer
        </div>
      </div>
    </div>
  );
}
