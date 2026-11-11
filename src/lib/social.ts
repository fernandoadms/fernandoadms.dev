export type SocialId = 'x' | 'linkedin' | 'github' | 'youtube' | 'rss';

interface SocialProfile {
  id: Exclude<SocialId, 'rss'>;
  label: string;
  handle: string;
  href: string;
}

/** Profiles in priority order: LinkedIn is the most active one, so it leads */
export const SOCIAL_PROFILES: readonly SocialProfile[] = [
  { id: 'linkedin', label: 'LinkedIn', handle: 'fernandoadms', href: 'https://www.linkedin.com/in/fernandoadms/' },
  { id: 'github', label: 'GitHub', handle: 'fernandoadms', href: 'https://github.com/fernandoadms' },
  { id: 'x', label: 'X (Twitter)', handle: '@fernandoadms', href: 'https://x.com/fernandoadms' },
];

export const CONTACT_EMAIL = 'fernando.alves0189@gmail.com';
