import type { EducationRole } from "@devx/core";
import type { Actor } from "./types";

export const adminActor: Actor = { role: "admin", userId: "admin" };

export function actorFor(role: EducationRole, userId: string): Actor {
  return { role, userId };
}
