import { useThemeStore } from '../store/themeStore';

// Some browsers ship the View Transitions API without types yet.
type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const doc = document as DocumentWithVT;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Fallback: no View Transitions support or user prefers reduced motion.
    if (!doc.startViewTransition || prefersReducedMotion) {
      toggleTheme();
      return;
    }

    // Origin of the wave = centre of the button that was clicked.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    // Radius needed to cover the whole viewport from that point.
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(() => {
      toggleTheme();
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 550,
          easing: 'cubic-bezier(0.16, 0.84, 0.44, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  };

  return (
    <button
      onClick={handleToggle}
      type="button"
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full  bg-white text-black hover:text-slate-900 hover:border-indigo-500/20 transition-all   dark:text-white dark:hover:text-white   dark:shadow-none"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun / moon icons cross-fade + rotate as the theme flips. */}
      <svg
        className={`absolute h-4.5 w-4.5 transition-all duration-500 ${
          isDark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {/* Moon */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
      <svg
        className={`absolute h-4.5 w-4.5 transition-all duration-500 ${
          isDark
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        {/* Sun */}
        <path
          fillRule="evenodd"
          d="M12 2.25a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM21.75 12a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM12 18a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6 12a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5H5.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 00-1.06 1.06l1.06 1.06z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
