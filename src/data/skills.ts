export interface Skill {
  name: string
  level: 1 | 2 | 3  // 1: 学習中, 2: 実務レベル, 3: 得意
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
      { name: 'React 19',       level: 3 },
      { name: 'TypeScript',     level: 2 },
      { name: 'Three.js / R3F', level: 2 },
      { name: 'GSAP',           level: 2 },
      { name: 'Tailwind CSS v4',level: 3 },
      { name: 'Vite 6',         level: 2 },
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
      { name: 'Java',        level: 2 },
      { name: 'Spring Boot', level: 2 },
      { name: 'MySQL',       level: 2 },
      { name: 'REST API',    level: 3 },
      { name: 'JUnit 5',     level: 2 },
      { name: 'MyBatis',     level: 1 },
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
      { name: 'AWS (EC2, RDS, S3)', level: 1 },
      { name: 'Docker',             level: 2 },
      { name: 'GitHub Actions',     level: 2 },
      { name: 'Cloudflare Pages',   level: 2 },
      { name: 'Git / GitHub',       level: 3 },
    ],
  },
]
