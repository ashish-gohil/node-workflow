import { cn } from '@/lib/utils'
import { Handle, Position } from '@xyflow/react'
import { Plus } from 'lucide-react'

type CustomHandleProps = {
  position?: Position
  type?: 'source' | 'target'
  showPlus?: boolean
  label?: string
  className?: string
  handleId: string
}

export function CustomHandle({
  position = Position.Right,
  type = 'source',
  showPlus = true,
  className,
  handleId,
}: CustomHandleProps) {
  return (
    <div
      className={cn(
        'absolute w-auto  top-1/2  flex items-center pointer-events-none',
        className
      )}
    >
      <Handle
        position={position}
        type={type}
        id={handleId}
        className="flex justify-start items-center pointer-events-auto w-8 rounded-full bg-bg-muted border border-border-default"
      >
        {showPlus && (
          <>
            <div className=" w-8 h-px bg-neutral-400" />
            <button className="absolute top-1 left-8 pointer-events-auto hover:cursor-pointer size-4 rounded-full border border-border-strong bg-accent-muted flex items-center justify-center hover:bg-accent-muted transition">
              <Plus size={14} className="text-text-primary" />
            </button>
          </>
        )}
      </Handle>
    </div>
  )
}
