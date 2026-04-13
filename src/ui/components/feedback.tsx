import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { useAppStore } from "@core/store";
import type { Toast } from "@core/store";

const toastIcons: Record<Toast["type"], typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle
};

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const dismiss = useAppStore((s) => s.dismissToast);
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = toastIcons[t.type];
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={16} />
            <span>{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)}><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

export function ConfirmModal() {
  const dialog = useAppStore((s) => s.confirmDialog);
  const clear = useAppStore((s) => s.clearConfirm);
  if (!dialog) return null;

  return (
    <div className="modal-overlay" onClick={clear}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{dialog.title}</h3>
        <p>{dialog.description}</p>
        <div className="modal-actions">
          <button className="button button-secondary" onClick={clear}>Annuler</button>
          <button className="button button-primary" onClick={dialog.onConfirm}>{dialog.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <Info size={24} />
      <p>{message}</p>
    </div>
  );
}

export function LoadingBar() {
  const loading = useAppStore((s) => s.loading);
  if (!loading) return null;
  return <div className="loading-bar" />;
}
