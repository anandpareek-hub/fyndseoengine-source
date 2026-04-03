import { auth } from "./auth";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth();
  return session;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  return session;
}
