import { Button } from "../../../shared/ui/Button";

type Props = {
  name: string;
  onLogout: () => void;
  isLoggingOut: boolean;
};

export function HomeHeader({ name, onLogout, isLoggingOut }: Props) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[color:var(--color-fern-950)]">
          Hola, {name}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-fern-600)]">
          Tu workspace está listo.
        </p>
      </div>

      <Button
        variant="ghost"
        onClick={onLogout}
        loading={isLoggingOut}
      >
        Cerrar sesión
      </Button>
    </div>
  );
}
