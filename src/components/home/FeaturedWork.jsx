import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { projects } from '../../data/projects';
import ProjectCard from '../common/ProjectCard';
import RevealOnScroll from '../animations/RevealOnScroll';
import Section from '../common/Section';

const FeaturedWork = () => {
  const featured = projects.filter((p) => p.featured);

  return (
    <Section className="border-t border-accent-400/10">
      <RevealOnScroll>
        <div className="flex items-end justify-between mb-14">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-accent-400 font-mono mb-2">Portfolio</p>
            <h2 className="text-3xl md:text-4xl font-display font-semibold text-text-100">
              Selected Work
            </h2>
          </div>
          <Link
            to="/work"
            className="hidden md:flex items-center gap-2 text-sm text-text-500 hover:text-accent-400 transition-colors group"
          >
            View all projects
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </RevealOnScroll>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featured.map((project, i) => (
          <RevealOnScroll key={project.id} delay={i * 0.1}>
            <ProjectCard project={project} />
          </RevealOnScroll>
        ))}
      </div>

      <Link
        to="/work"
        className="md:hidden flex items-center justify-center gap-2 mt-10 text-sm text-accent-400"
      >
        View all projects <ArrowRight size={14} />
      </Link>
    </Section>
  );
};

export default FeaturedWork;
