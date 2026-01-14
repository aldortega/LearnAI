import { GraduationCap, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../../shared/hooks/useAuth";

export function Header() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-100 bg-white/80 px-8 backdrop-blur-md">
      {/* Left: Branding */}
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-900 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight text-emerald-900">
          LearnAI
        </span>
      </div>

      {/* Right: User Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-2 ring-transparent transition-all hover:bg-emerald-200 focus:outline-none focus:ring-emerald-200"
          aria-label="User menu"
        >
          <User className="h-5 w-5" />
        </button>

        {/* Dropdown */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg border border-zinc-100 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
            <div className="border-b border-zinc-100 px-4 py-2">
              <p className="truncate text-sm font-medium text-zinc-900">
                {user?.email || "Usuario"}
              </p>
            </div>
            <button
              onClick={() => {
                logout();
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-zinc-50"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
// Force rebuild
