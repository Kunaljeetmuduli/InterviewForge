import { AppNavigation } from "@/components/app-navigation";

export default function AuthenticatedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNavigation />
      <main className="px-5 py-10 sm:px-8 md:ml-64 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
