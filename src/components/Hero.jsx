// Hero component: Full-height hero section with name, title, tagline, and call-to-action buttons
import '../styles.css';

const Hero = () => {
  // Smooth scroll to section when button is clicked
  const handleScrollTo = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="home" className="hero">
      <div className="hero-content">
        <h1 className="hero-name">VIGNON TIM</h1>
        <h2 className="hero-title">Engineering Student | Cybersecurity • AI • DevOps</h2>
        <p className="hero-tagline">
          Exchange student at UNIST (South Korea) and engineering student at UTT (France). 
          Seeking a 6-month internship in early 2026 to apply knowledge in Cybersecurity, AI, and DevOps.
        </p>
        <div className="hero-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => handleScrollTo('projects')}
          >
            View Projects
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => handleScrollTo('contact')}
          >
            Contact Me
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
