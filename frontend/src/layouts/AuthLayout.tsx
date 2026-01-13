import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-md-surface text-md-on-surface">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
        <div className="w-full rounded-[32px] bg-md-surface-container p-8 shadow-sm">
          <h1 className="text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-md-on-surface-variant">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
