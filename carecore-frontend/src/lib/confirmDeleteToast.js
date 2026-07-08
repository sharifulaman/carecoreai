import { toast } from "sonner";

// Shows a toast-style delete confirmation (matches the app's existing sonner toasts)
// instead of the native browser confirm() dialog. `label` should identify the specific
// record being deleted, e.g. `"HM Revenue & Customs"` or "this document".
export function confirmDeleteToast(label, onConfirm) {
  toast(`Delete ${label}?`, {
    description: "This action cannot be undone.",
    action: {
      label: "Delete",
      onClick: onConfirm,
    },
    actionButtonStyle: { background: "#dc2626", color: "#fff" },
    cancel: {
      label: "Cancel",
      onClick: () => {},
    },
  });
}
