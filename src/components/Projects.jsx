// Projects component: Displays project cards mapped from projectsData array with title, description, tech stack, and links
import { projectsData } from '../data/projectsData';
import '../styles.css';

const Projects = () => {
  return (
    <section id="projects" className="projects">
      <div className="container">
        <h2 className="section-title">Projects</h2>
        <div className="projects-grid">
          {projectsData.map((project) => (
            <div key={project.id} className="project-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 className="project-title">{project.title}</h3>
                {project.status && (
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--accent-primary)', 
                    border: '1px solid var(--accent-primary)', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px' 
                  }}>
                    {project.status}
                  </span>
                )}
              </div>
              <p className="project-description">{project.description}</p>
              <div className="project-tech">
                {project.techStack.map((tech, index) => (
                  <span key={index} className="tech-tag">{tech}</span>
                ))}
              </div>
              <div className="project-links">
                {project.githubLink !== '#' && (
                  <a 
                    href={project.githubLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="project-link"
                  >
                    GitHub
                  </a>
                )}
                {project.demoLink !== '#' && (
                  <a 
                    href={project.demoLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="project-link"
                  >
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
