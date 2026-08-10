import { useMediaQuery } from './useMediaQuery';
import { useLayoutMode } from './useLayoutMode';

export function useIsMobile(): boolean {
  const { mode } = useLayoutMode();
  const isNarrow = useMediaQuery('(max-width: 1024px)');
  if (mode === 'mobile') return true;
  if (mode === 'web') return false;
  return isNarrow;
}
