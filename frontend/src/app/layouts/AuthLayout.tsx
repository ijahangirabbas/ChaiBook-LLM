import { Outlet } from 'react-router-dom'
import { cn } from '../../lib/utils'

export function AuthLayout() {
  return (
    <div className={cn(
      'min-h-screen flex items-stretch',
      'bg-gradient-to-br from-[#EEF2FF] via-[#F3F4FF] to-[#E8EBFF]',
      'dark:from-[#000000] dark:via-[#050510] dark:to-[#000000]'
    )}>
      <Outlet />
    </div>
  )
}
