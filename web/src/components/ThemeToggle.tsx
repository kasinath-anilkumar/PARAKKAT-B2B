import { useThemeStore } from '../store/themeStore';
import { FiSun, FiMoon } from 'react-icons/fi';

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
      <FiMoon
        className={`absolute h-[18px] w-[18px] transition-all duration-500 ${
          isDark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />
      <FiSun
        className={`absolute h-[18px] w-[18px] transition-all duration-500 ${
          isDark
            ? 'rotate-90 scale-0 opacity-0'
            : 'rotate-0 scale-100 opacity-100'
        }`}
      />
    </button>
  );
}
