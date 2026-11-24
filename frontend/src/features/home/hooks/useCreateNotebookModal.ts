import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type CreateNotebookModalState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

function isOpenCreateRequest(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "openCreateNotebook" in state &&
    state.openCreateNotebook === true
  );
}

export function useCreateNotebookModal(): CreateNotebookModalState {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isRequested = isOpenCreateRequest(location.state);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    if (isRequested) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [isRequested, location.pathname, navigate]);

  return { isOpen: isOpen || isRequested, open, close };
}
