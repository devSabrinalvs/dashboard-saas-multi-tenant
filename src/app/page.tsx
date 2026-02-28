import { redirect } from "next/navigation";
import { getSession } from "@/auth";

export default async function HomePage() {
  const session = await getSession();
  redirect(session ? "/org/select" : "/login");
}
