"use client";

import { createContext, useContext } from "react";
import { useAuthInternal, type AuthState } from "@/components/useAuth";

const AuthContext = createContext<AuthState | null>(null);

/**
 * Hält den Anmeldezustand genau einmal für die ganze App.
 * Ohne das holt jede Komponente mit useAuth() die Sitzung separat —
 * und die Komponenten können auseinanderlaufen.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthInternal();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth muss innerhalb von <AuthProvider> verwendet werden");
  }
  return ctx;
}
