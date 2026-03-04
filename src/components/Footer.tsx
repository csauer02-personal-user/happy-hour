import Link from "next/link";

export default function Footer() {
  return (
    <footer className="shrink-0 relative z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="rainbow-bar" />
      <div className="bg-brand-purple/95 px-3 py-1 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] flex items-center justify-center gap-3">
        <p className="text-white/60 text-[10px]">
          ATL Happy Hour &copy; {new Date().getFullYear()}
        </p>
        <Link
          href="/deal-updater"
          className="text-white/40 text-[10px] hover:text-white/70 transition-colors"
        >
          &#x1f984; Members
        </Link>
      </div>
    </footer>
  );
}
