import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "../../../shared/ui/Button";
import type { InvitationPermission, UserSearchItem } from "../types/collaboration.types";

type Props = {
  searchQuery: string;
  selectedUsername: string;
  users: UserSearchItem[];
  isSearching: boolean;
  searchError: string | null;
  permission: InvitationPermission;
  isSubmitting: boolean;
  canSubmit: boolean;
  showValidationError: boolean;
  error: string | null;
  onSearchQueryChange: (value: string) => void;
  onSelectedUsernameChange: (value: string) => void;
  onPermissionChange: (value: InvitationPermission) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const permissionOptions: Array<{ value: InvitationPermission; label: string }> = [
  { value: "read_only", label: "Lector" },
  { value: "can_manage_documents", label: "Editor" },
];

export function InviteUserInlineForm({
  searchQuery,
  selectedUsername,
  users,
  isSearching,
  searchError,
  permission,
  isSubmitting,
  canSubmit,
  showValidationError,
  error,
  onSearchQueryChange,
  onSelectedUsernameChange,
  onPermissionChange,
  onSubmit,
}: Props) {
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const exactMatch = useMemo(
    () => users.find((item) => item.username.toLowerCase() === normalizedQuery),
    [normalizedQuery, users],
  );

  const shouldShowSuggestions = useMemo(() => {
    return isAutocompleteOpen && searchQuery.trim().length >= 2;
  }, [isAutocompleteOpen, searchQuery]);

  const selectInvitee = (username: string) => {
    onSearchQueryChange(username);
    onSelectedUsernameChange(username);
    setIsAutocompleteOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error ? (
        <p role="alert" className="rounded-lg border border-error bg-error/10 px-3 py-2 text-sm text-error">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Invitar colaborador</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_112px_112px]">
          <div className="relative">
            <input
              id="invitee_username"
              name="invitee_username"
              value={searchQuery}
              onChange={(event) => {
                const value = event.target.value;
                onSearchQueryChange(value);
                setIsAutocompleteOpen(true);
                setHighlightedIndex(-1);

                const match = users.find(
                  (item) => item.username.toLowerCase() === value.trim().toLowerCase(),
                );
                onSelectedUsernameChange(match ? match.username : "");
              }}
              onFocus={() => setIsAutocompleteOpen(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  setIsAutocompleteOpen(false);
                  setHighlightedIndex(-1);
                }, 100);
              }}
              onKeyDown={(event) => {
                if (!shouldShowSuggestions) return;

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightedIndex((prev) => (prev + 1 >= users.length ? 0 : prev + 1));
                  return;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightedIndex((prev) => (prev <= 0 ? users.length - 1 : prev - 1));
                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setIsAutocompleteOpen(false);
                  setHighlightedIndex(-1);
                  return;
                }

                if (event.key !== "Enter") return;

                if (highlightedIndex >= 0 && users[highlightedIndex]) {
                  event.preventDefault();
                  selectInvitee(users[highlightedIndex].username);
                  return;
                }

                if (exactMatch) {
                  onSelectedUsernameChange(exactMatch.username);
                  setIsAutocompleteOpen(false);
                  setHighlightedIndex(-1);
                  return;
                }

                if (users.length > 0) {
                  event.preventDefault();
                  selectInvitee(users[0].username);
                }
              }}
              placeholder="Buscar usuario"
              autoComplete="off"
              required
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {shouldShowSuggestions ? (
              <div className="absolute left-0 right-0 top-[calc(100%-1px)] z-20 overflow-hidden rounded-b-lg border border-border bg-surface shadow-lg">
                {isSearching ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>
                ) : users.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    {searchError ?? "No hay resultados para este username."}
                  </p>
                ) : (
                  <ul className="max-h-40 overflow-y-auto py-1" role="listbox">
                    {users.map((item, index) => {
                      const isActive =
                        selectedUsername.toLowerCase() === item.username.toLowerCase() ||
                        highlightedIndex === index;

                      return (
                        <li key={item.id} role="option" aria-selected={isActive}>
                          <button
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectInvitee(item.username);
                            }}
                            className={
                              "w-full px-3 py-2 text-left text-sm transition " +
                              (isActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted")
                            }
                          >
                            <span className="font-medium">@{item.username}</span>
                            {item.name || item.last_name ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {item.name} {item.last_name}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <label htmlFor="invite_permission" className="sr-only">
              Permiso
            </label>
            <select
              id="invite_permission"
              value={permission}
              onChange={(event) => onPermissionChange(event.target.value as InvitationPermission)}
              className="h-10 w-full appearance-none rounded-lg border border-border bg-surface pl-3 pr-9 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {permissionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>

          <Button type="submit" loading={isSubmitting} disabled={!canSubmit} className="h-10 w-full px-3">
            Enviar
          </Button>
        </div>
      </div>

      {showValidationError ? (
        <p role="alert" className="text-sm text-error">
          Selecciona un usuario valido de las sugerencias
        </p>
      ) : null}
    </form>
  );
}
