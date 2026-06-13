import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";

export type ModalKey =
  | "demo"
  | "report"
  | "assessment"
  | "memory"
  | "requirements"
  | "agentAccess"
  | "partnership"
  | "portalStudent"
  | "portalAgent"
  | "portalUniversity"
  | "portalAdmin"
  | null;

interface UICtx {
  modal: ModalKey;
  modalPayload: unknown;
  openModal: (k: Exclude<ModalKey, null>, payload?: unknown) => void;
  closeModal: () => void;
  comingSoon: (label?: string) => void;
}

const Ctx = createContext<UICtx>({
  modal: null,
  modalPayload: null,
  openModal: () => {},
  closeModal: () => {},
  comingSoon: () => {},
});

export function UIProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalKey>(null);
  const [modalPayload, setModalPayload] = useState<unknown>(null);

  const openModal = useCallback((k: Exclude<ModalKey, null>, payload?: unknown) => {
    setModalPayload(payload ?? null);
    setModal(k);
  }, []);
  const closeModal = useCallback(() => {
    setModal(null);
    setModalPayload(null);
  }, []);

  const comingSoon = useCallback((label?: string) => {
    toast(label ?? "Coming soon", {
      description: "This feature is part of the upcoming ACCA Transfer AI platform.",
    });
  }, []);

  return (
    <Ctx.Provider value={{ modal, modalPayload, openModal, closeModal, comingSoon }}>
      {children}
    </Ctx.Provider>
  );
}

export const useUI = () => useContext(Ctx);
