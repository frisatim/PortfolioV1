import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const variants = {
  primary: 'bg-accent-500 text-text-100 hover:bg-accent-400 hover:-translate-y-0.5 shadow-lg shadow-accent-500/20',
  outline: 'border border-accent-400/30 text-accent-400 hover:bg-accent-400/10',
  ghost: 'text-accent-400 hover:text-accent-400/80',
};

const Button = ({ children, variant = 'primary', href, className = '', ...props }) => {
  const cls = `inline-flex items-center gap-2 px-8 py-4 font-medium text-sm tracking-wide transition-all duration-300 cursor-pointer ${variants[variant]} ${className}`;

  // Internal link — use React Router
  if (href && href.startsWith('/')) {
    return (
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
        <Link to={href} className={cls} {...props}>
          {children}
        </Link>
      </motion.div>
    );
  }

  // External link
  if (href) {
    return (
      <motion.a
        href={href}
        className={cls}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        {...props}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      className={cls}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
