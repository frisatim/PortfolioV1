import PageTransition from '../components/layout/PageTransition';
import Section from '../components/common/Section';
import RevealOnScroll from '../components/animations/RevealOnScroll';
import { experience, skills } from '../data/experience';

const About = () => (
  <PageTransition>
    {/* Hero */}
    <Section className="pt-36! md:pt-44!">
      <RevealOnScroll>
        <p className="text-xs uppercase tracking-[0.15em] text-accent-400 font-mono mb-3">About</p>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-text-100 mb-8">
          Tim Vignon
        </h1>
      </RevealOnScroll>

      <RevealOnScroll delay={0.1}>
        <div className="max-w-3xl">
          <p className="text-lg text-text-300 leading-relaxed mb-6">
            Engineering student specializing in Network and Communications at the University of Technology of Troyes (UTT), currently interning at the LIST3N research lab — working at the intersection of network analysis and artificial intelligence.
          </p>
          <p className="text-lg text-text-300 leading-relaxed mb-6">
            My academic journey has taken me across three continents — studying in France, China (Shanghai University, 2nd place at Innovation Bootcamp), and South Korea (UNIST) — giving me a global perspective and adaptability.
          </p>
          <p className="text-lg text-text-300 leading-relaxed">
            Beyond academics, I tutor international students in French and pursue interests in volleyball, badminton, entrepreneurship, and astronomy.
          </p>
        </div>
      </RevealOnScroll>
    </Section>

    {/* Timeline */}
    <Section className="border-t border-accent-400/10">
      <RevealOnScroll>
        <p className="text-xs uppercase tracking-[0.15em] text-accent-400 font-mono mb-3">Journey</p>
        <h2 className="text-3xl font-display font-semibold text-text-100 mb-14">Experience &amp; Education</h2>
      </RevealOnScroll>

      <div className="relative pl-8 border-l-2 border-accent-400/20 max-w-3xl">
        {experience.map((item, i) => (
          <RevealOnScroll key={i} delay={i * 0.08}>
            <div className="mb-12 last:mb-0 relative">
              {/* Dot on timeline */}
              <div className="absolute -left-[calc(2rem+5px)] top-1.5 w-3 h-3 rounded-full border-2 border-accent-400 bg-base-950" />

              <p className="text-sm font-mono font-bold text-accent-400 mb-1">{item.year}</p>
              <h3 className="text-lg font-display font-semibold text-text-100 mb-1">{item.title}</h3>
              <p className="text-sm text-text-500 mb-2">
                {item.org} &mdash; {item.location}
              </p>
              <p className="text-sm text-text-300 leading-relaxed">{item.description}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>

    {/* Skills */}
    <Section className="border-t border-accent-400/10">
      <RevealOnScroll>
        <p className="text-xs uppercase tracking-[0.15em] text-accent-400 font-mono mb-3">Expertise</p>
        <h2 className="text-3xl font-display font-semibold text-text-100 mb-14">Skills &amp; Tools</h2>
      </RevealOnScroll>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl">
        {Object.entries(skills).map(([category, items], ci) => (
          <RevealOnScroll key={category} delay={ci * 0.1}>
            <div>
              <h3 className="text-sm uppercase tracking-widest text-text-500 font-mono mb-4">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs px-3 py-1.5 bg-accent-400/5 border border-accent-400/15 text-accent-400 font-mono hover:bg-accent-400/15 transition-colors cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  </PageTransition>
);

export default About;
