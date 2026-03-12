import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useScrollProgress from '../../hooks/useScrollProgress';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { label: 'Work', path: '/work' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

const Header = () => {
  const { scrollY } = useScrollProgress();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = scrollY > 60;
  const menuRef = useRef(null);
  const toggleRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Focus trap for mobile menu
  useEffect(() => {
    if (!mobileOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const focusable = menu.querySelectorAll('a, button');
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();

    const trap = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    menu.addEventListener('keydown', trap);
    return () => menu.removeEventListener('keydown', trap);
  }, [mobileOpen]);

  const toggle = useCallback(() => setMobileOpen((v) => !v), []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-base-950/90 backdrop-blur-md border-b border-accent-400/10'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 md:px-8 py-5 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="font-display text-lg font-semibold text-text-100 tracking-tight hover:text-accent-400 transition-colors"
          aria-label="Home"
        >
          TV
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-10">
          {navItems.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className={`text-xs uppercase tracking-[0.18em] transition-colors duration-300 ${
                location.pathname === path
                  ? 'text-accent-400'
                  : 'text-text-500 hover:text-accent-400'
              }`}
              {...(location.pathname === path ? { 'aria-current': 'page' } : {})}
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
        </div>

        {/* Mobile: toggle + hamburger */}
        <div className="md:hidden flex items-center gap-3">
          <ThemeToggle />
          <button
            ref={toggleRef}
            className="text-text-300 hover:text-accent-400 transition-colors cursor-pointer"
          onClick={toggle}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            className="md:hidden bg-base-950/95 backdrop-blur-lg border-b border-accent-400/10 px-6 pb-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {navItems.map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                role="menuitem"
                className={`block py-3 text-sm uppercase tracking-widest transition-colors ${
                  location.pathname === path ? 'text-accent-400' : 'text-text-500 hover:text-accent-400'
                }`}
                {...(location.pathname === path ? { 'aria-current': 'page' } : {})}
              >
                {label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
