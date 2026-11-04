import type { ToastPayload } from "../../../shared/ui/toast/toastContext";

export const ALLOWED_SOURCE_EXTENSIONS = [".pdf", ".docx", ".txt", ".pptx"] as const;

export type SourceExtension = (typeof ALLOWED_SOURCE_EXTENSIONS)[number];

export type SplitSourceFiles = {
  validFiles: File[];
  rejectedFiles: File[];
};

function isSourceExtension(value: string): value is SourceExtension {
  return ALLOWED_SOURCE_EXTENSIONS.some((extension) => extension === value);
}

export function getSourceExtension(fileName: string): SourceExtension | null {
  const extension = `.${fileName.split(".").pop() ?? ""}`.toLowerCase();
  return isSourceExtension(extension) ? extension : null;
}

export function splitSourceFiles(files: File[]): SplitSourceFiles {
  const validFiles: File[] = [];
  const rejectedFiles: File[] = [];

  for (const file of files) {
    if (getSourceExtension(file.name)) {
      validFiles.push(file);
    } else {
      rejectedFiles.push(file);
    }
  }

  return { validFiles, rejectedFiles };
}

export function buildRejectedFilesToast(rejectedFiles: File[]): ToastPayload {
  const names = rejectedFiles.map((file) => `"${file.name}"`).join(", ");
  const subject = rejectedFiles.length === 1 ? `No se subió ${names}` : `No se subieron ${names}`;
  return {
    variant: "error",
    title: `${subject}: solo se aceptan PDF, DOCX, TXT o PPTX.`,
  };
}
