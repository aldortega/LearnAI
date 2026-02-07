import { z } from "zod";

const notebookEmojiSchema = z
  .string()
  .max(16, "El emoji no puede superar los 16 caracteres")
  .nullable()
  .optional();

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
  emoji: notebookEmojiSchema,
});

export const notebookUpdateSchema = z.object({
  title: z
    .string()
    .min(1, "El título es obligatorio")
    .max(120, "El título no puede superar los 120 caracteres"),
  description: z
    .string()
    .max(500, "La descripción no puede superar los 500 caracteres")
    .optional()
    .nullable(),
  emoji: notebookEmojiSchema,
});

export type NotebookCreateSchema = z.infer<typeof notebookCreateSchema>;
export type NotebookUpdateSchema = z.infer<typeof notebookUpdateSchema>;
export type NotebookCreateInput = z.infer<typeof notebookCreateSchema>;
export type NotebookUpdateInput = z.infer<typeof notebookUpdateSchema>;
