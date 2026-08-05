"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import AuthModal from "@/components/auth/AuthModal";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return <AuthModal isOpen onClose={() => undefined} showCloseButton={false} />;
}

export default AuthGuard;
