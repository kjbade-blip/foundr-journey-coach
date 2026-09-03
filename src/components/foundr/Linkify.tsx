import type { ReactNode } from "react";

const URL_RE = /((?:https?:\/\/|www\.)[^\s<>()[\]{}"']+[^\s<>()[\]{}"'.,;:!?]|(?:[a-z0-9][a-z0-9-]*\.)+(?:co\.uk|org\.uk|ac\.uk|com|co|uk|org|net|io|ai|app|shop|store|dev|info|biz)(?:\/[^\s<>()[\]{}"']*)?)/gi;

function href(raw: string) {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/** Strips protocol and trailing slash for a tidier label. */
export function prettyUrl(raw: string) {
  return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * Renders text with any web address turned into a clickable external link.
 * Safe to use anywhere text may contain a URL.
 */
export function Linkify({ children, className }: { children: ReactNode; className?: string }) {
  if (typeof children !== "string") return <>{children}</>;
  const text = children;
  const parts = text.split(URL_RE);
  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (i % 2 === 1) {
          return (
            <a
              key={i}
              href={href(part)}
              target="_blank"
              rel="noreferrer noopener"
              className={
                className ??
                "break-all font-medium text-brand-dark underline decoration-brand-dark/40 underline-offset-2 hover:decoration-brand-dark"
              }
            >
              {prettyUrl(part)}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
