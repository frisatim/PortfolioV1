const Section = ({ children, className = '', id }) => (
  <section id={id} className={`py-24 md:py-32 ${className}`}>
    <div className="max-w-7xl mx-auto px-6 md:px-8">
      {children}
    </div>
  </section>
);

export default Section;
