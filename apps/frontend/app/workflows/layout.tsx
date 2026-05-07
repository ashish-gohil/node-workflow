import Header from "@/components/ui/header";

export default function LayoutWorkflow({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="z-50 shrink-0">
        <Header />
      </div>
      <main className="bg-bg-canvas flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
