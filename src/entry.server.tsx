import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { cspNonce } from "@/lib/server/request";

export default async function handleRequest(request: Request, status: number, headers: Headers, routerContext: EntryContext) {
  const nonce = cspNonce();
  let failed = false;
  const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} nonce={nonce} />, {
    nonce,
    signal: request.signal,
    onError(error: unknown) { failed = true; console.error(error); },
  });
  // Search engines get the complete page; people get it streamed.
  if (isbot(request.headers.get("user-agent") || "")) await body.allReady;
  headers.set("Content-Type", "text/html; charset=utf-8");
  return new Response(body, { headers, status: failed ? 500 : status });
}
