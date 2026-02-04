import { LogOut, Monitor, Moon, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../../../shared/hooks/useAuth";
import { useTheme } from "../../../shared/hooks/useTheme";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700 ring-2 ring-transparent transition-all hover:bg-green-200 focus:outline-none focus:ring-green-200 dark:bg-green-500/20 dark:text-green-200 dark:hover:bg-green-500/30"
        aria-label="User menu"
      >
        <User className="h-5 w-5" />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg border border-zinc-100 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-50 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {user?.email || "Usuario"}
            </p>
          </div>
          <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Tema
            </p>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition " +
                  (theme === "system"
                    ? "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60")
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
                    ? "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60")
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
                    ? "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60")
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
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-zinc-50 dark:text-red-400 dark:hover:bg-zinc-800/60"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
