import type { ComponentType, SVGProps } from "react";

import DocxIcon from "../../../assets/file-icons/docx.svg?react";
import PdfIcon from "../../../assets/file-icons/pdf.svg?react";
import PptxIcon from "../../../assets/file-icons/pptx.svg?react";
import TxtIcon from "../../../assets/file-icons/txt.svg?react";
import { getSourceExtension, type SourceExtension } from "../utils/sourceFiles";

type Props = {
  fileName: string;
  className?: string;
};

const ICONS_BY_EXTENSION: Record<SourceExtension, ComponentType<SVGProps<SVGSVGElement>>> = {
  ".pdf": PdfIcon,
  ".docx": DocxIcon,
  ".txt": TxtIcon,
  ".pptx": PptxIcon,
};

export function SourceFileTypeIcon({ fileName, className }: Props) {
  const extension = getSourceExtension(fileName);
  if (!extension) {
    return null;
  }

  const Icon = ICONS_BY_EXTENSION[extension];
  return <Icon className={className} aria-hidden="true" />;
}
