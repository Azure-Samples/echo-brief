// Simplified version for brevity
import { useState } from "react"

interface Toast {
  id: number;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  [key: string]: any;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  return {
    toasts,
    toast: (props: Omit<Toast, "id">) => {
      setToasts((prevToasts) => [...prevToasts, { id: Date.now(), ...props }])
    },
    dismiss: (id: number) => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
    },
  }
}

