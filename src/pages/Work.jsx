import PageTransition from '../components/layout/PageTransition';
import Section from '../components/common/Section';
import ProjectCard from '../components/common/ProjectCard';
import RevealOnScroll from '../components/animations/RevealOnScroll';
import { projects } from '../data/projects';

const Work = () => (
  <PageTransition>
    <Section className="pt-36! md:pt-44!">
      <RevealOnScroll>
        <p className="text-xs uppercase tracking-[0.15em] text-accent-400 font-mono mb-3">Portfolio</p>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-text-100 mb-4">
          Work
        </h1>
        <p className="text-text-300 max-w-xl mb-14">
          A selection of projects exploring cybersecurity, machine learning, and cloud&nbsp;engineering.
        </p>
      </RevealOnScroll>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project, i) => (
          <RevealOnScroll key={project.id} delay={i * 0.08}>
            <ProjectCard project={project} />
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  </PageTransition>
);

export default Work;
