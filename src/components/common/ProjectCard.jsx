import { motion } from 'framer-motion';
import { ExternalLink, Github } from 'lucide-react';

const ProjectCard = ({ project }) => (
  <motion.div
    className="group relative bg-base-800/60 border border-accent-400/10 overflow-hidden transition-colors duration-500 hover:border-accent-400/30"
    whileHover={{ y: -4 }}
    transition={{ duration: 0.3 }}
  >
    {/* Gradient top bar */}
    <div className="h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent" />

    <div className="p-6 md:p-8">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-accent-400 mb-2 font-mono">
            {project.category}
          </p>
          <h3 className="text-xl font-display font-semibold text-text-100 leading-tight">
            {project.title}
          </h3>
        </div>
        {project.status && (
          <span className="text-[10px] uppercase tracking-widest text-accent-400 border border-accent-400/30 px-2 py-1 shrink-0 ml-4">
            {project.status}
          </span>
        )}
      </div>

      <p className="text-sm text-text-300 leading-relaxed mb-6">
        {project.description}
      </p>

      {/* Tech tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {project.techStack.map((tech) => (
          <span
            key={tech}
            className="text-xs px-3 py-1 bg-accent-400/5 border border-accent-400/15 text-accent-400 font-mono"
          >
            {tech}
          </span>
        ))}
      </div>

      {/* Links */}
      <div className="flex gap-4">
        {project.githubLink && (
          <a
            href={project.githubLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-text-500 hover:text-accent-400 transition-colors"
          >
            <Github size={14} /> GitHub
          </a>
        )}
        {project.demoLink && (
          <a
            href={project.demoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-text-500 hover:text-accent-400 transition-colors"
          >
            <ExternalLink size={14} /> Live Demo
          </a>
        )}
      </div>
    </div>
  </motion.div>
);

export default ProjectCard;
