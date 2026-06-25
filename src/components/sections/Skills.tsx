import { useLanguage } from '../../hooks/useLanguage'

const skillGroups = [
  {
    label: 'Frontend',
    skills: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Three.js / R3F', 'GSAP', 'Framer Motion'],
  },
  {
    label: 'Backend',
    skills: ['Java', 'Spring Boot', 'REST API', 'MySQL', 'Docker'],
  },
  {
    label: 'Cloud & DevOps',
    skills: ['AWS (EC2, RDS, S3)', 'Cloudflare Pages', 'GitHub Actions', 'CI/CD'],
  },
  {
    label: 'AI / Tools',
    skills: ['Gemini API', 'Chrome Extension', 'Git', 'Figma'],
  },
]

export default function Skills() {
  const { t } = useLanguage()

  return (
    <section
      id="skills"
      style={{ pointerEvents: 'auto' }}
      className="py-24 px-6 md:px-16"
    >
      <h2 className="text-3xl md:text-5xl font-en font-extrabold text-[var(--color-tx)] mb-4">
        {t.skills_h}
      </h2>
      <p className="text-[var(--color-sub)] mb-16 max-w-xl">{t.skills_desc}</p>
      <div className="grid md:grid-cols-2 gap-10">
        {skillGroups.map((group) => (
          <div key={group.label} className="reveal">
            <h3 className="font-en font-bold text-[var(--color-or2)] mb-4 text-sm uppercase tracking-wider">
              {group.label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {group.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-2 rounded-lg text-sm bg-[var(--color-warm)] text-[var(--color-tx)] border border-[var(--color-bd)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
