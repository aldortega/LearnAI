import { useMemo, useState } from "react";

import type { UserSearchItem } from "../types/collaboration.types";

type Props = {
  searchQuery: string;
  selectedUsername: string;
  users: UserSearchItem[];
  isSearching: boolean;
  searchError: string | null;
  showValidationError: boolean;
  onSearchQueryChange: (value: string) => void;
  onSelectedUsernameChange: (value: string) => void;
};

export function InviteeAutocompleteField({
  searchQuery,
  selectedUsername,
  users,
  isSearching,
  searchError,
  showValidationError,
  onSearchQueryChange,
  onSelectedUsernameChange,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const normalizedQuery = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery],
  );

  const exactMatch = useMemo(
    () => users.find((item) => item.username.toLowerCase() === normalizedQuery),
    [normalizedQuery, users],
  );

  const shouldShowSuggestions = isOpen && searchQuery.trim().length >= 2;

  const selectUsername = (username: string) => {
    onSearchQueryChange(username);
    onSelectedUsernameChange(username);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="invitee_username" className="block text-sm font-medium text-foreground">
        Buscar usuario
        <span className="text-primary"> *</span>
      </label>

      <div className="relative">
        <input
          id="invitee_username"
          name="invitee_username"
          value={searchQuery}
          onChange={(event) => {
            const value = event.target.value;
            onSearchQueryChange(value);
            setIsOpen(true);
            setHighlightedIndex(-1);

            const match = users.find(
              (item) => item.username.toLowerCase() === value.trim().toLowerCase(),
            );
            onSelectedUsernameChange(match ? match.username : "");
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => {
              setIsOpen(false);
              setHighlightedIndex(-1);
            }, 100);
          }}
          onKeyDown={(event) => {
            if (!shouldShowSuggestions) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightedIndex((prev) =>
                prev + 1 >= users.length ? 0 : prev + 1,
              );
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightedIndex((prev) =>
                prev <= 0 ? users.length - 1 : prev - 1,
              );
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setIsOpen(false);
              setHighlightedIndex(-1);
              return;
            }

            if (event.key !== "Enter") return;

            if (highlightedIndex >= 0 && users[highlightedIndex]) {
              event.preventDefault();
              selectUsername(users[highlightedIndex].username);
              return;
            }

            if (exactMatch) {
              onSelectedUsernameChange(exactMatch.username);
              setIsOpen(false);
              setHighlightedIndex(-1);
              return;
            }

            if (users.length > 0) {
              event.preventDefault();
              selectUsername(users[0].username);
            }
          }}
          placeholder="Escribe un username"
          autoComplete="off"
          required
          className={
            "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-all duration-200 " +
            "placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary hover:border-border-strong"
          }
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
                          selectUsername(item.username);
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

      {showValidationError ? (
        <p role="alert" className="text-sm text-error">
          Selecciona un usuario valido de las sugerencias
        </p>
      ) : null}
    </div>
  );
}
