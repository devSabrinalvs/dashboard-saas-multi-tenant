/**
 * Re-exporta o helper getServerSession já configurado com authOptions.
 * Use este import no lugar de importar getServerSession diretamente.
 *
 * Exemplo:
 *   import { getSession } from "@/auth";
 *   const session = await getSession();
 */
import { getServerSession } from "next-auth";
import { authOptions } from "./options";

export { authOptions };

export async function getSession() {
  return getServerSession(authOptions);
}
