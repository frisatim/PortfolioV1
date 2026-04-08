import { ArrowRight } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import IntroSection from '../components/home/IntroSection';
import FeaturedWork from '../components/home/FeaturedWork';
import Section from '../components/common/Section';
import Button from '../components/common/Button';
import RevealOnScroll from '../components/animations/RevealOnScroll';

const Home = () => {
  return (
    <PageTransition>
      <IntroSection />
      <FeaturedWork />

      {/* CTA */}
      <Section className="border-t border-accent-400/10">
        <RevealOnScroll>
          <div className="text-center">
            <h2 className="text-3xl md:text-5xl font-display font-semibold text-text-100 mb-4">
              Let's get in touch !
            </h2>
            <p className="text-text-300 mb-8 max-w-lg mx-auto">
              Whether it's AI, security, or cloud - let's build something together.
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
