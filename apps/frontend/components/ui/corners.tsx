import { cn } from '@/lib/utils'

type CornerSize = 'xs' | 'sm' | 'md' | 'lg'

const sizeMap: Record<CornerSize, string> = {
  xs: 'size-1',
  sm: 'size-2',
  md: 'size-3',
  lg: 'size-4',
}

export default function CornerIcons({
  size = 'md',
  className,
}: {
  size?: CornerSize
  className?: string
}) {
  const base = cn(
    'absolute pointer-events-none border-border-strong',
    sizeMap[size],
    className
  )

  return (
    <>
      <span className={cn(base, 'top-1 left-1 border-t-2 border-l-2')} />
      <span className={cn(base, 'top-1 right-1 border-t-2 border-r-2')} />
      <span className={cn(base, 'bottom-1 left-1 border-b-2 border-l-2')} />
      <span className={cn(base, 'bottom-1 right-1 border-b-2 border-r-2')} />
    </>
  )
}
