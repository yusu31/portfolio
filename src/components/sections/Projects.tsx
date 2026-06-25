import { useLanguage } from '../../hooks/useLanguage'

interface Project {
  titleKey: 'taiiku_title' | 'task_title' | 'err_title'
  probKey: 'taiiku_prob' | 'task_prob' | 'err_prob'
  solKey: 'taiiku_sol' | 'task_sol' | 'err_sol'
  impKey: 'taiiku_imp' | 'task_imp' | 'err_imp'
  demoUrl: string
  tags: string[]
}

const projects: Project[] = [
  {
    titleKey: 'taiiku_title',
    probKey: 'taiiku_prob',
    solKey: 'taiiku_sol',
    impKey: 'taiiku_imp',
    demoUrl: '#',
    tags: ['React', 'Spring Boot', 'Gemini API', 'MySQL'],
  },
  {
    titleKey: 'task_title',
    probKey: 'task_prob',
    solKey: 'task_sol',
    impKey: 'task_imp',
    demoUrl: '#',
    tags: ['React', 'Spring Boot', 'AWS', 'Docker'],
  },
  {
    titleKey: 'err_title',
    probKey: 'err_prob',
    solKey: 'err_sol',
    impKey: 'err_imp',
    demoUrl: '#',
    tags: ['Chrome Extension', 'TypeScript', 'Gemini API'],
  },
]

export default function Projects() {
  const { t } = useLanguage()

  return (
    <section
      id="projects"
      style={{ pointerEvents: 'auto' }}
      className="py-24 px-6 md:px-16"
    >
      <h2 className="text-3xl md:text-5xl font-en font-extrabold text-[var(--color-tx)] mb-4">
        {t.proj_h}
      </h2>
      <p className="text-[var(--color-sub)] mb-16 max-w-xl">{t.proj_desc}</p>
      <div className="flex flex-col gap-12">
        {projects.map((p) => (
          <div key={p.titleKey} className="reveal border border-[var(--color-bd)] rounded-2xl p-8">
            <h3 className="text-xl font-en font-bold text-[var(--color-tx)] mb-4">{t[p.titleKey]}</h3>
            <p className="text-sm text-[var(--color-sub)] mb-2">{t[p.probKey]}</p>
            <p className="text-sm text-[var(--color-tx)] mb-2">{t[p.solKey]}</p>
            <p className="text-sm font-semibold text-[var(--color-or2)] mb-4">{t[p.impKey]}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {p.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs bg-[var(--color-warm)] text-[var(--color-sub)] border border-[var(--color-bd)]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <a
              href={p.demoUrl}
              className="text-sm font-semibold text-[var(--color-or2)] hover:underline"
            >
              {t.demo_link}
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}
