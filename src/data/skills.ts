export interface Skill {
  name: string
}

export interface SkillCategory {
  id: string
  label: string
  description: string
  color: string
  hotspotX: string
  hotspotY: string
  skills: Skill[]
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    description: 'UIとインタラクション',
    color: '#4fc3f7',
    hotspotX: '22%',
    hotspotY: '45%',
    skills: [
      { name: 'React 19' },
      { name: 'TypeScript' },
      { name: 'Three.js / R3F' },
      { name: 'GSAP' },
      { name: 'Tailwind CSS v4' },
      { name: 'Vite 6' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    description: 'サーバーとデータ',
    color: '#ffb300',
    hotspotX: '50%',
    hotspotY: '35%',
    skills: [
      { name: 'Java' },
      { name: 'Spring Boot' },
      { name: 'MySQL' },
      { name: 'REST API' },
      { name: 'JUnit 5' },
      { name: 'MyBatis' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    description: 'デプロイと環境',
    color: '#69f0ae',
    hotspotX: '75%',
    hotspotY: '48%',
    skills: [
      { name: 'AWS (EC2, RDS, S3)' },
      { name: 'Docker' },
      { name: 'GitHub Actions' },
      { name: 'Cloudflare Pages' },
      { name: 'Git / GitHub' },
    ],
  },
]
