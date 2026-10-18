import { z } from "zod";

import { bff } from "./client";
import { UserSchema, MeSchema } from "@/types";

const AuthResultSchema = z.object({ user: UserSchema });

export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export function login(input: LoginInput) {
  return bff("/api/bff/auth/login", {
    method: "POST",
    body: input,
    schema: AuthResultSchema,
  });
}

export function register(input: RegisterInput) {
  return bff("/api/bff/auth/register", {
    method: "POST",
    body: input,
    schema: AuthResultSchema,
  });
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/** The BFF swaps the session cookie for the fresh token; only the user comes back. */
export function changePassword(input: ChangePasswordInput) {
  return bff("/api/bff/auth/change-password", {
    method: "POST",
    body: input,
    schema: AuthResultSchema,
  });
}

/** Always resolves with the same message whether or not the account exists. */
export function forgotPassword(email: string) {
  return bff("/api/bff/auth/forgot-password", {
    method: "POST",
    body: { email },
    schema: z.object({ ok: z.literal(true), message: z.string() }),
  });
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export function resetPassword(input: ResetPasswordInput) {
  return bff("/api/bff/auth/reset-password", {
    method: "POST",
    body: input,
    schema: z.object({ ok: z.literal(true) }),
  });
}

export function logout() {
  return bff("/api/bff/auth/logout", { method: "POST" });
}

export function getMe() {
  return bff("/api/bff/auth/me", { method: "GET", schema: MeSchema });
}
