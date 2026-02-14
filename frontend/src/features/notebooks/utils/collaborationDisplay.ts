import type { InvitationPermission } from "../types/collaboration.types";

export function getPermissionLabel(value: InvitationPermission): string {
  return value === "can_manage_documents" ? "Editor" : "Lector";
}

export function getDisplayName(
  name: string | null | undefined,
  lastName: string | null | undefined,
  username: string,
): string {
  const fullName = `${name ?? ""} ${lastName ?? ""}`.trim();
  if (fullName.length > 0) return fullName;
  return `@${username}`;
}

export function getInitials(name: string): string {
  const words = name
    .split(" ")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return "U";
  return words.map((item) => item[0]?.toUpperCase() ?? "").join("");
}
