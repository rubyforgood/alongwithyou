import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and drops the ones Tailwind would have overridden anyway.
 * Every component in src/components/ui/ runs its classes through this, which is
 * what lets a `className` prop beat the component's own defaults instead of
 * landing in an undefined order.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
