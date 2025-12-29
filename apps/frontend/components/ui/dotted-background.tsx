import { cn } from '@/lib/utils'
import React, { ReactNode } from 'react'

export default function DottedBackground({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center bg-bg bg-[radial-gradient(var(--color-surface)_1px,transparent_1px)] bg-size-[20px_20px]',
        className
      )}
    >
      {children}
    </div>
  )
}
