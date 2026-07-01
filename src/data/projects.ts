export interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  liveUrl?: string
  githubUrl?: string
  status: 'live' | 'planned'
}

export interface ProjectCategory {
  id: string
  icon: string
  label: string
  color: string
  hotspotX: string
  hotspotY: string
  projects: Project[]
}

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  {
    id: 'webapp',
    icon: '🌐',
    label: 'Webアプリ',
    color: '#4fc3f7',
    hotspotX: '25%',
    hotspotY: '35%',
    projects: [
      {
        id: 'task-management',
        name: 'Task Management',
        description: 'タスク管理Webアプリ（RaiseTech課題）',
        tech: ['Spring Boot', 'React', 'MySQL', 'Docker'],
        githubUrl: 'https://github.com/yusu31/TaskManagement',
        status: 'live',
      },
      {
        id: 'event-finder',
        name: 'Event Finder',
        description: 'イベント検索・登録アプリ（RaiseTech課題）',
        tech: ['Spring Boot', 'React', 'MySQL'],
        githubUrl: 'https://github.com/yusu31/EventFinder',
        status: 'live',
      },
    ],
  },
  {
    id: 'game',
    icon: '🎮',
    label: 'ゲーム',
    color: '#ffb300',
    hotspotX: '70%',
    hotspotY: '40%',
    projects: [
      {
        id: 'typing-dungeon',
        name: 'TYPING DUNGEON',
        description: 'プログラミング用語タイピングRPG',
        tech: ['Phaser.js', 'TypeScript', 'Gemini API'],
        status: 'planned',
      },
      {
        id: 'marathon-rpg',
        name: 'MARATHON RPG',
        description: '実走距離でキャラが進むRPG',
        tech: ['React', 'Samsung Health API', 'Phaser.js'],
        status: 'planned',
      },
    ],
  },
  {
    id: 'website',
    icon: '🖥',
    label: 'Webサイト / LP',
    color: '#69f0ae',
    hotspotX: '30%',
    hotspotY: '65%',
    projects: [
      {
        id: 'portfolio',
        name: 'このポートフォリオ',
        description: 'ohzi.io風3Dインタラクティブポートフォリオ',
        tech: ['React', 'Three.js', 'R3F', 'GSAP'],
        githubUrl: 'https://github.com/yusu31/portfolio',
        status: 'live',
      },
    ],
  },
  {
    id: 'tool',
    icon: '🔧',
    label: 'ツール / 自動化',
    color: '#ce93d8',
    hotspotX: '68%',
    hotspotY: '65%',
    projects: [
      {
        id: 'error-translator',
        name: 'エラー翻訳くん',
        description: '英語エラーを日本語で解説するChrome拡張',
        tech: ['TypeScript', 'Chrome Extension API', 'Gemini API'],
        status: 'planned',
      },
    ],
  },
]
