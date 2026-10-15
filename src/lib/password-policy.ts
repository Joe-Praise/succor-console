import { z } from "zod";

/**
 * Client mirror of agent-service's password policy (lib/auth.ts
 * `newPasswordSchema`). The server is authoritative — this only gives
 * immediate field-level feedback instead of a generic 400.
 *
 * Max is 72 BYTES, not characters: bcrypt ignores everything past that, so the
 * service rejects longer passwords rather than silently truncating them.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `At least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((p) => new TextEncoder().encode(p).length <= PASSWORD_MAX_BYTES, {
    message: "Too long — keep it under 72 characters",
  });
