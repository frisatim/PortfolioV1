import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check, AlertCircle, Github, Linkedin, Mail } from 'lucide-react';
import PageTransition from '../components/layout/PageTransition';
import Section from '../components/common/Section';
import RevealOnScroll from '../components/animations/RevealOnScroll';

// Replace with your Formspree form ID (https://formspree.io)
const FORMSPREE_URL = 'https://formspree.io/f/mgonllnv';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.message.trim()) e.message = 'Message is required';
    else if (form.message.trim().length < 10) e.message = 'At least 10 characters';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }

    setStatus('sending');
    try {
      const res = await fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('sent');
        setForm({ name: '', email: '', message: '' });
        setTimeout(() => setStatus('idle'), 4000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 4000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const inputCls = (field) =>
    `w-full bg-base-900/60 border ${
      errors[field] ? 'border-red-500/60' : 'border-accent-400/15 focus:border-accent-400'
    } px-5 py-4 text-text-100 placeholder-text-500 text-sm outline-none transition-colors duration-300`;

  return (
    <PageTransition>
      <Section className="pt-36! md:pt-44!">
        <RevealOnScroll>
          <p className="text-xs uppercase tracking-[0.15em] text-accent-400 font-mono mb-3">Contact</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-text-100 mb-4">
            Let's work together
          </h1>
          <p className="text-text-300 max-w-xl mb-14">
            Have a project in mind or just want to connect? Drop me a message.
          </p>
        </RevealOnScroll>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 max-w-5xl">
          {/* Form */}
          <RevealOnScroll delay={0.1} className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {status === 'sent' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 border border-green-400/20 px-5 py-3"
                >
                  <Check size={16} /> Message sent successfully!
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 px-5 py-3"
                >
                  <AlertCircle size={16} /> Failed to send. Please try again or email me directly.
                </motion.div>
              )}

              <div>
                <label htmlFor="name" className="sr-only">Your name</label>
                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className={inputCls('name')}
                />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="email" className="sr-only">Your email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={inputCls('email')}
                />
                {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="message" className="sr-only">Your message</label>
                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Tell me about your project..."
                  className={`${inputCls('message')} resize-none`}
                />
                {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={status === 'sending'}
                className="flex items-center gap-2 bg-accent-500 hover:bg-accent-400 text-text-100 px-8 py-4 text-sm font-medium tracking-wide transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 cursor-pointer"
                whileTap={{ scale: 0.97 }}
              >
                {status === 'sending' ? (
                  <>Sending...</>
                ) : (
                  <>Send Message <Send size={14} /></>
                )}
              </motion.button>
            </form>
          </RevealOnScroll>

          {/* Sidebar info */}
          <RevealOnScroll delay={0.2} className="lg:col-span-2">
            <div className="space-y-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-text-500 font-mono mb-3">Email</p>
                <a
                  href="mailto:tim.vignon@gmail.com"
                  className="text-accent-400 hover:text-accent-400/80 transition-colors text-sm"
                >
                  tim.vignon@gmail.com
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-text-500 font-mono mb-3">Location</p>
                <p className="text-sm text-text-300">Vitteaux, France</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-text-500 font-mono mb-3">Socials</p>
                <div className="flex gap-4">
                  <a
                    href="https://github.com/timvignon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-text-500 hover:text-accent-400 transition-colors"
                  >
                    <Github size={14} /> GitHub
                  </a>
                  <a
                    href="https://www.linkedin.com/in/tim-vignon-110701260"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-text-500 hover:text-accent-400 transition-colors"
                  >
                    <Linkedin size={14} /> LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </Section>
    </PageTransition>
  );
};

export default Contact;
