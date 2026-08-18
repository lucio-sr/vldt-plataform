import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Cliente do Better Auth — aponta para a API (onde /api/auth está montado). */
export const authClient = createAuthClient({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001",
  plugins: [organizationClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
