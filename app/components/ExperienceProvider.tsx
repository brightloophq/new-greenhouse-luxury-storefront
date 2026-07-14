import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {Link, type LinkProps} from 'react-router';
import {
  DEFAULT_EXPERIENCE,
  EXPERIENCE_COOKIE,
  EXPERIENCE_COOKIE_MAX_AGE,
  type ExperienceMode,
} from '~/lib/experience';

interface ExperienceContextValue {
  experience: ExperienceMode;
  setExperience: (mode: ExperienceMode) => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

/**
 * Provides the active experience to the tree. Seeded from the server (cookie),
 * so SSR and first client render agree. Switching writes the cookie and flips
 * `<html data-experience>` immediately (flash-free re-theme) — it never touches
 * the cart, and needs no reload.
 */
export function ExperienceProvider({
  experience: initial,
  children,
}: {
  experience: ExperienceMode;
  children: React.ReactNode;
}) {
  const [experience, setState] = useState<ExperienceMode>(
    initial ?? DEFAULT_EXPERIENCE,
  );

  const setExperience = useCallback((mode: ExperienceMode) => {
    setState(mode);
    if (typeof document !== 'undefined') {
      document.cookie = `${EXPERIENCE_COOKIE}=${mode}; Path=/; Max-Age=${EXPERIENCE_COOKIE_MAX_AGE}; SameSite=Lax`;
      // Instant, flash-free re-theme; the cookie handles SSR on the next load.
      document.documentElement.dataset.experience = mode;
    }
  }, []);

  const value = useMemo(
    () => ({experience, setExperience}),
    [experience, setExperience],
  );

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx) {
    throw new Error('useExperience must be used within an <ExperienceProvider>');
  }
  return ctx;
}

/**
 * A Link that keeps the shopper inside the active experience. The cookie
 * already persists the experience across navigations, so this is currently a
 * thin wrapper — it is the seam for future experience-aware href rewriting
 * without touching call sites.
 */
export function ExperienceLink(props: LinkProps) {
  return <Link {...props} />;
}

/** Tags a subtree with the active experience for any experience-scoped styling. */
export function ExperienceLayout({children}: {children: React.ReactNode}) {
  const {experience} = useExperience();
  return (
    <div className={`ng-experience ng-experience--${experience}`}>
      {children}
    </div>
  );
}
