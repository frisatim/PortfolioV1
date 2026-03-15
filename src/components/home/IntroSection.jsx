import RevealOnScroll from '../animations/RevealOnScroll';
import Section from '../common/Section';

const metrics = [
  { value: '3', label: 'Countries Studied' },
  { value: '4+', label: 'Projects Built' },
  { value: '2nd', label: 'Innovation Bootcamp' },
];

const IntroSection = () => (
  <Section className="border-t border-accent-400/10">
    <RevealOnScroll>
      <p className="text-2xl md:text-4xl font-light text-text-100 leading-snug max-w-4xl mx-auto text-center">
        I build{' '}
        <span className="text-accent-400">secure, intelligent systems</span>{' '}
        that merge cybersecurity expertise with machine&nbsp;learning &mdash; from intrusion detection to medical&nbsp;imaging.
      </p>
    </RevealOnScroll>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto">
      {metrics.map((m, i) => (
        <RevealOnScroll key={m.label} delay={i * 0.1}>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-display font-bold text-accent-400 mb-2">
              {m.value}
            </p>
            <p className="text-xs uppercase tracking-[0.15em] text-text-500 font-mono">
              {m.label}
            </p>
          </div>
        </RevealOnScroll>
      ))}
    </div>
  </Section>
);

export default IntroSection;
