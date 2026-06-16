import logo from "@/assets/foundr-logo-v2.png.asset.json";

export function Logo({ className = "h-9", showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <img
      src={logo.url}
      alt={showWordmark ? "Found-r — Clarity Before Commitment" : "Found-r"}
      className={className}
      draggable={false}
    />
  );
}
