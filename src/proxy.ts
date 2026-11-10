import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Verificação otimista: rotas internas exigem cookie de sessão válido.
// A autorização por papel é feita no servidor (páginas e Server Actions).
const PUBLICAS = ["/", "/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.includes(pathname) || pathname.startsWith("/portal")) return NextResponse.next();

  const token = req.cookies.get("sessao")?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET ?? ""));
      return NextResponse.next();
    } catch {}
  }
  const url = new URL("/login", req.url);
  url.searchParams.set("de", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
