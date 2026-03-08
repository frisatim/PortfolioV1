import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import Section from '../components/common/Section';

const NotFound = () => (
  <PageTransition>
    <Section className="pt-36! md:pt-44! min-h-[60vh] flex items-center">
      <div className="text-center mx-auto">
        <p className="text-8xl md:text-9xl font-display font-bold text-accent-400/20 mb-4">404</p>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-text-100 mb-4">
          Page not found
        </h1>
        <p className="text-text-300 mb-10">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-accent-500 hover:bg-accent-400 text-text-100 text-sm font-medium tracking-wide transition-all duration-300 hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    </Section>
  </PageTransition>
);

export default NotFound;
