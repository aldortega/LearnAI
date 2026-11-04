import { LANDING_ROLES } from "../utils/landingContent";
import { SectionHeading } from "./SectionHeading";
import { SharedNotebookPreview } from "./shared-notebook/SharedNotebookPreview";

export function SharedNotebookSection() {
  return (
    <section aria-labelledby="compartido-title" className="border-t border-border py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <SectionHeading
            id="compartido-title"
            eyebrow="Cuadernos compartidos"
            title="Un cuaderno, todo el grupo"
            description="Invitá a tus compañeros con su correo y estudien juntos sobre las mismas fuentes."
          />
          <dl className="mt-10 flex flex-col divide-y divide-border border-y border-border">
            {LANDING_ROLES.map((role) => (
              <div key={role.name} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6">
                <dt className="w-28 shrink-0 text-sm font-medium text-foreground">{role.name}</dt>
                <dd className="text-sm leading-6 text-muted-foreground">{role.description}</dd>
              </div>
            ))}
          </dl>
        </div>

        <SharedNotebookPreview />
      </div>
    </section>
  );
}
