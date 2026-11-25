import type { DemoSourceStatus } from "../../types/onboarding.types";
import { DemoDropzone } from "../DemoDropzone";
import { DemoSourceItem } from "../DemoSourceItem";

type Props = {
  status: DemoSourceStatus;
  progress: number;
};

export function UploadSourceScene({ status, progress }: Props) {
  return (
    <div className="mx-auto flex min-h-44 w-full max-w-sm flex-col gap-3">
      <DemoDropzone status={status} />
      {status === "processing" || status === "done" ? <DemoSourceItem status={status} progress={progress} /> : null}
    </div>
  );
}
