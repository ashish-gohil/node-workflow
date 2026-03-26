import { cn } from "@/lib/utils";

type CornerSize = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<CornerSize, string> = {
  xs: "size-1",
  sm: "size-2",
  md: "size-3",
  lg: "size-4",
};

export default function CornerIcons({
  size = "md",
  className,
}: {
  size?: CornerSize;
  className?: string;
}) {
  const base = cn("absolute pointer-events-none border-border-default", sizeMap[size], className);

  return (
    <>
      <span className={cn(base, "top-0.5 left-0.5 border-t border-l")} />
      <span className={cn(base, "top-0.5 right-0.5 border-t border-r")} />
      <span className={cn(base, "bottom-0.5 left-0.5 border-b border-l")} />
      <span className={cn(base, "bottom-0.5 right-0.5 border-b border-r")} />
    </>
  );
}
