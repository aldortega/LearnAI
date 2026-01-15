import { z } from "zod";

import type { NotebookCreate } from "../types/notebooks.types";

export const notebookCreateSchema = z.object({
  title: z
    .string()
    .min(1, "El título es obligatorio")
    .max(120, "El título no puede superar los 120 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .optional()
    .nullable(),
});

export type NotebookCreateSchema = z.infer<typeof notebookCreateSchema>;
export type NotebookCreateInput = NotebookCreate;
