"use client";

import { useSession } from "next-auth/react";
import { Header } from "./header";

/**
 * The `AdminHeaderClient` component is a client-side component that renders a
 * `Header` component only when the user is authenticated.
 *
 * The `Header` component is rendered with the `session` prop, which is obtained
 * from the `useSession` hook.
 *
 * The `AdminHeaderClient` component is used in the `admin` layout to render the
 * header when the user is authenticated.
 *
 * @returns A `Header` component if the user is authenticated, otherwise `null`.
 */
export function AdminHeaderClient() {
  const { data: session } = useSession();
  // Render nothing until session is available to avoid flicker
  if (!session) return null;
  return <Header session={session} className="" role="admin"/>;
}
