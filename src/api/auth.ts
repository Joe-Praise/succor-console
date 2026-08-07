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

export function logout() {
  return bff("/api/bff/auth/logout", { method: "POST" });
}

export function getMe() {
  return bff("/api/bff/auth/me", { method: "GET", schema: MeSchema });
}
