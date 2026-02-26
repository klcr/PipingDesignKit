import { useSyncExternalStore } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

const BREAKPOINTS = {
  tablet: 640,
  desktop: 1024,
  wide: 1400,
} as const;

function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

let currentBreakpoint: Breakpoint = getBreakpoint(
  typeof window !== 'undefined' ? window.innerWidth : 0
);

const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  const queries = [
    window.matchMedia(`(min-width: ${BREAKPOINTS.wide}px)`),
    window.matchMedia(`(min-width: ${BREAKPOINTS.desktop}px)`),
    window.matchMedia(`(min-width: ${BREAKPOINTS.tablet}px)`),
  ];

  const update = () => {
    const next = getBreakpoint(window.innerWidth);
    if (next !== currentBreakpoint) {
      currentBreakpoint = next;
      listeners.forEach(l => l());
    }
  };

  for (const mq of queries) {
    mq.addEventListener('change', update);
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Breakpoint {
  return currentBreakpoint;
}

function getServerSnapshot(): Breakpoint {
  return 'mobile';
}

export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile';
}

export function useIsDesktop(): boolean {
  const bp = useBreakpoint();
  return bp === 'desktop' || bp === 'wide';
}
