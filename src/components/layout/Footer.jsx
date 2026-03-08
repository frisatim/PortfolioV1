import { Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => (
  <footer className="border-t border-accent-400/10 bg-base-950">
    <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
      <p className="text-xs text-text-500 tracking-wide">
        &copy; {new Date().getFullYear()} Tim Vignon. Built with React &amp; Three.js
      </p>
      <div className="flex items-center gap-6">
        <a
          href="https://github.com/timvignon"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-500 hover:text-accent-400 transition-colors"
          aria-label="GitHub"
        >
          <Github size={16} />
        </a>
        <a
          href="https://www.linkedin.com/in/tim-vignon-110701260"
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-500 hover:text-accent-400 transition-colors"
          aria-label="LinkedIn"
        >
          <Linkedin size={16} />
        </a>
        <a
          href="mailto:tim.vignon@gmail.com"
          className="text-text-500 hover:text-accent-400 transition-colors"
          aria-label="Email"
        >
          <Mail size={16} />
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
