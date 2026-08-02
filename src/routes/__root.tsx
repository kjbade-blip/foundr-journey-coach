import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border border-input bg-background px-5 py-2.5 text-sm font-semibold hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Found-r — Clarity Before Commitment" },
      { name: "description", content: "The AI-powered operating system to discover, validate, launch and grow brick-and-mortar businesses." },
      { property: "og:title", content: "Found-r — Clarity Before Commitment" },
      { property: "og:description", content: "The AI-powered operating system to discover, validate, launch and grow brick-and-mortar businesses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Found-r — Clarity Before Commitment" },
      { name: "twitter:description", content: "The AI-powered operating system to discover, validate, launch and grow brick-and-mortar businesses." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/799cc933-ff24-4ff7-b0ca-7d0622b4b40b/id-preview-9a367028--566ea121-7bc7-4116-92e8-c11cbe721dba.lovable.app-1783075817619.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/799cc933-ff24-4ff7-b0ca-7d0622b4b40b/id-preview-9a367028--566ea121-7bc7-4116-92e8-c11cbe721dba.lovable.app-1783075817619.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
