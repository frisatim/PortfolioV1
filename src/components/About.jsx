// About component: Bio section with responsive two-column layout (desktop) and single column (mobile)
import '../styles.css';

const About = () => {
  return (
    <section id="about" className="about">
      <div className="container">
        <h2 className="section-title">About Me</h2>
        <div className="about-content">
          <div className="about-text">
            <p>
              I'm an engineering student specializing in Network and Communications at the University 
              of Technology of Troyes (UTT), currently on an exchange program at Ulsan National Institute 
              of Technology (UNIST) in South Korea, focusing on Informatics and Artificial Intelligence.
            </p>
            <p>
              My academic journey has taken me across three continents—studying in France, China (Shanghai University), 
              and South Korea—providing me with a global perspective and adaptability. I'm passionate about 
              Cybersecurity, AI, and DevOps, and I'm seeking a 6-month engineering internship in early 2026 
              to apply my knowledge and contribute to innovative projects.
            </p>
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>Education</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: 'var(--accent-primary)' }}>UNIST</strong> - Ulsan, South Korea (Sept 2025 - Jan 2026)<br/>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Informatics and Artificial Intelligence • Exchange Program</span>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ color: 'var(--accent-primary)' }}>UTT</strong> - Troyes, France (2024 - 2027)<br/>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Network and Communications Engineering</span>
              </div>
              <div>
                <strong style={{ color: 'var(--accent-primary)' }}>UTSEUS</strong> - Shanghai, China (March - July 2024)<br/>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Preparatory Program • Innovation Program (2nd place at Innovation Bootcamp)</span>
              </div>
            </div>
            <p style={{ marginTop: '1.5rem' }}>
              Beyond academics, I tutor international students in French, helping them improve their language 
              skills and providing cultural guidance. I'm also working towards my Cisco CCNA certification 
              and enjoy sports like Volleyball and Badminton, as well as entrepreneurship and astronomy.
            </p>
          </div>
          <div className="about-image">
            <div className="about-placeholder">
              {/* Placeholder for profile image - you can add an img tag here */}
              <span>Your Photo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
