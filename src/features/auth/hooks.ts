"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import * as authApi from "@/api/auth";
import { resolveLanding } from "@/features/auth/landing";

export const meKey = ["me"] as const;

/** Current session. `retry: false` so a 401 resolves immediately (not authed). */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: () => authApi.getMe(),
    retry: false,
    staleTime: 60_000,
  });
}

/**
 * Post-auth destination, resolved BEFORE navigating so members land straight
 * on /o/… (never a visible /dashboard hop). An ?invite= token outranks
 * everything (the user is mid-invite-acceptance); then an explicit ?next=
 * (set by the proxy redirect); else the landing resolver picks admin / the
 * right org / onboarding from a fresh /auth/me.
 */
async function postAuthDestination(qc: ReturnType<typeof useQueryClient>): Promise<string> {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get("invite");
  if (invite) return `/invite?token=${encodeURIComponent(invite)}`;
  const next = params.get("next");
  if (next && next.startsWith("/")) return next;
  try {
    const me = await qc.fetchQuery({ queryKey: meKey, queryFn: () => authApi.getMe() });
    return resolveLanding(me);
  } catch {
    return "/dashboard"; // resolver page falls back gracefully
  }
}

export function useLogin() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: meKey });
      router.push(await postAuthDestination(qc));
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: meKey });
      router.push(await postAuthDestination(qc));
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.clear();
      router.replace("/login");
    },
  });
}
