'use client'

import AppLogo from './app-logo'
import ThemeToggle from './theme-toggle'
import { Button } from './button'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  return (
    <header className="w-full h-20 bg-surface border-b border-default px-6 py-4 flex justify-between items-center">
      <AppLogo />

      <div className="flex flex-row gap-6 justify-between">
        <ThemeToggle />
        <Button
          onClick={() => {
            router.push('/workflow/new')
          }}
          className="relative rounded-none"
          allowCorners={true}
          cornerSize="sm"
        >
          Create workflow
        </Button>
      </div>
    </header>
  )
}
