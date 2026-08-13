import type { ToasterProps } from "sonner";

export const toasterConfig: ToasterProps = {
  className: "toaster group",
  style: {
    "--normal-bg": "var(--popover)",
    "--normal-text": "var(--popover-foreground)",
    "--normal-border": "var(--border)",
    "--border-radius": "var(--radius)",
  } as React.CSSProperties,
  toastOptions: {
    classNames: {
      toast: "cn-toast",
    },
  },
  duration: 4000,
  gap: 12,
  visibleToasts: 3,
  position: "bottom-right",
  closeButton: true,
  expand: false,
  richColors: false,
  invert: false,
};
