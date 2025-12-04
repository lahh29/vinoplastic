
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';

export function Logo({ className }: { className?: string }) {
  return (
    <Building className={cn("text-primary", className)} />
  );
}
