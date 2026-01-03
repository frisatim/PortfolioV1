// Skills component: Grid display of skill badges showing technologies and tools
import '../styles.css';

const Skills = () => {
  const skills = [
    'Python',
    'Bash',
    'Pandas',
    'PyTorch',
    'Scikit-learn',
    'TensorFlow',
    'Machine Learning',
    'Deep Learning',
    'Computer Vision',
    'Cybersecurity',
    'Network Security',
    'Docker',
    'Kubernetes',
    'AWS',
    'DevOps',
    'Linux',
    'Windows',
    'Git',
    'Cisco CCNA'
  ];

  return (
    <section id="skills" className="skills">
      <div className="container">
        <h2 className="section-title">Skills</h2>
        <div className="skills-grid">
          {skills.map((skill, index) => (
            <div key={index} className="skill-badge">
              {skill}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Skills;
