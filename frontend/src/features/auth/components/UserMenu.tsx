import { LogOut, Monitor, Moon, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../../../shared/hooks/useAuth";
import { useTheme } from "../../../shared/hooks/useTheme";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarUrl = user?.avatar_url ?? null;
  const showAvatarPhoto = Boolean(avatarUrl) && avatarUrl !== failedAvatarUrl;
  const displayName = `${user?.name ?? ""} ${user?.last_name ?? ""}`.trim() || user?.email || "Usuario";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary ring-2 ring-transparent transition-all hover:bg-primary/20 focus:outline-none focus:ring-primary/30"
        aria-label="User menu"
      >
        {showAvatarPhoto ? (
          <img
            src={avatarUrl ?? undefined}
            alt={`Avatar de ${user?.email ?? "usuario"}`}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setFailedAvatarUrl(avatarUrl)}
          />
        ) : (
          <User className="h-5 w-5" />
        )}
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
          <div className="border-b border-border px-4 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
          </div>
          <div className="border-b border-border px-3 py-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tema
            </p>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition " +
                  (theme === "system"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted")
                }
              >
                <span className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Sistema
                </span>
                {theme === "system" ? (
                  <span className="text-xs">{resolvedTheme === "dark" ? "Oscuro" : "Claro"}</span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition " +
                  (theme === "light"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted")
                }
              >
                <span className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Claro
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition " +
                  (theme === "dark"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted")
                }
              >
                <span className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Oscuro
                </span>
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              setIsMenuOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      )}
    </div>
  );
}


