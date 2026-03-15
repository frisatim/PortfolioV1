import { lazy, Suspense } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition';
import IntroSection from '../components/home/IntroSection';
import FeaturedWork from '../components/home/FeaturedWork';
import Section from '../components/common/Section';
import Button from '../components/common/Button';
import RevealOnScroll from '../components/animations/RevealOnScroll';
import useResponsiveView from '../hooks/useResponsiveView';

// Lazy-load both views — mobile never downloads the heavy 3D bundle
const WorldMapHero = lazy(() => import('../components/home/WorldMapHero'));
const MobileMapView = lazy(() => import('../components/home/MobileMapView'));

// Fallback shows the hero text immediately so FCP/LCP are fast
const GlobeFallback = () => (
  <section className="h-screen w-full bg-base-950 flex flex-col items-center justify-center relative">
    <motion.p
      className="text-accent-400 text-xs md:text-sm tracking-[0.3em] uppercase mb-4 font-mono"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.6 }}
    >
      Global Network
    </motion.p>
    <motion.h1
      className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-text-100 mb-6 text-center px-4"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
    >
      Tim Vignon
    </motion.h1>
    <motion.p
      className="text-lg md:text-2xl text-text-300 font-light text-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      Engineering Student — Cybersecurity • AI • DevOps
    </motion.p>
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
      <div className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
    </div>
  </section>
);

const Home = () => {
  const view = useResponsiveView(); // 'globe' | 'map' — switches at 768px

  return (
    <PageTransition>
      <Suspense fallback={<GlobeFallback />}>
        {view === 'globe' ? <WorldMapHero /> : <MobileMapView />}
      </Suspense>
      <IntroSection />
      <FeaturedWork />

      {/* CTA */}
      <Section className="border-t border-accent-400/10">
        <RevealOnScroll>
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-display font-semibold text-text-100 mb-4">
              Ready to start a project?
            </h2>
            <p className="text-text-300 mb-8 max-w-lg mx-auto">
              Whether it's AI, security, or cloud — let's build something together.
            </p>
            <Button href="/contact" variant="primary">
              Get in Touch <ArrowRight size={16} />
            </Button>
          </div>
        </RevealOnScroll>
      </Section>
    </PageTransition>
  );
};

export default Home;
