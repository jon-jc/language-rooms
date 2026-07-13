import { z } from "zod";
import type { RoomRole } from "@prisma/client";

/**
 * In-room moderation domain rules (docs/modules/host-controls.md).
 * Pure functions — unit-tested in tests/moderation.test.ts.
 */

export const KICK_COOLDOWN_MINUTES = 15;

export const moderateActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mute"), targetUserId: z.string().min(1) }),
  z.object({ action: z.literal("kick"), targetUserId: z.string().min(1) }),
  z.object({ action: z.literal("promote"), targetUserId: z.string().min(1) }),
  z.object({ action: z.literal("grantSpeak"), targetUserId: z.string().min(1) }),
  z.object({ action: z.literal("revokeSpeak"), targetUserId: z.string().min(1) }),
  z.object({ action: z.literal("lock") }),
  z.object({ action: z.literal("unlock") }),
  z.object({
    action: z.literal("setCapacity"),
    capacity: z.number().int().min(2).max(50),
  }),
]);

export type ModerateAction = z.infer<typeof moderateActionSchema>;

/** Only the host may change room structure or roles; moderators handle people. */
const HOST_ONLY_ACTIONS = new Set(["promote", "lock", "unlock", "setCapacity"]);

/**
 * Whether `actorRole` may perform `action` on `targetRole`.
 * - PARTICIPANTs moderate nothing.
 * - MODERATORs may mute/kick/grant/revoke-speak PARTICIPANTs only.
 * - HOSTs may do everything to anyone except kick/mute themselves via API.
 */
export function canModerate(input: {
  actorRole: RoomRole;
  action: ModerateAction["action"];
  targetRole?: RoomRole;
  actorIsTarget?: boolean;
}): boolean {
  const { actorRole, action, targetRole, actorIsTarget } = input;
  if (actorRole === "PARTICIPANT") return false;
  if (actorIsTarget) return false;
  if (HOST_ONLY_ACTIONS.has(action)) return actorRole === "HOST";
  if (actorRole === "MODERATOR") {
    return targetRole === "PARTICIPANT" || targetRole === undefined;
  }
  return true; // HOST
}
