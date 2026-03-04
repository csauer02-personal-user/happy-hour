import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 py-2 shadow-lg">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-white/90 hover:text-white text-sm font-medium flex items-center min-h-[44px] px-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            &larr; Home
          </Link>
          <UserMenu />
        </div>
      </header>
      {children}
    </>
  );
}
