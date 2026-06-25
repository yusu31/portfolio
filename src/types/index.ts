export type Lang = 'ja' | 'en'

export type TranslationKey =
  | 'nav_impact' | 'nav_story' | 'nav_works' | 'nav_blog' | 'nav_contact'
  | 'hero_badge' | 'hero_sub' | 'hero_cta1' | 'hero_cta2'
  | 'imp1_desc' | 'imp2_desc' | 'imp3_desc' | 'imp4_desc'
  | 'story_h' | 'story_desc'
  | 'proj_h' | 'proj_desc'
  | 'taiiku_title' | 'taiiku_prob' | 'taiiku_sol' | 'taiiku_imp'
  | 'task_title' | 'task_prob' | 'task_sol' | 'task_imp'
  | 'err_title' | 'err_prob' | 'err_sol' | 'err_imp'
  | 'demo_link'
  | 'skills_h' | 'skills_desc'
  | 'blog_h' | 'blog_desc' | 'blog_soon_title' | 'blog_soon_desc'
  | 'contact_h' | 'contact_desc'
  | 'f_name' | 'f_name_ph' | 'f_email' | 'f_msg' | 'f_msg_ph' | 'f_submit'

export type Translations = Record<TranslationKey, string>
