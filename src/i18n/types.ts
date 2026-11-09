/**
 * The single content contract for every locale.
 * Each locale file is typed as `Content`, so a missing or extra key fails `astro check`.
 */

export type Locale = 'en' | 'pt' | 'es';

export interface LabeledValue {
  label: string;
  value: string;
}

export interface Link {
  label: string;
  href: string;
}

export interface SectionHeader {
  /** Format "NN / Section name". */
  kicker: string;
  title?: string;
  intro?: string;
}

export type SkillIcon = 'code' | 'spark' | 'shield' | 'globe';
export type AchievementIcon = 'mic' | 'mentor' | 'council' | 'paper';
export type ProjectTier = 'featured' | 'secondary' | 'small';
export type JourneyType = 'work' | 'education';

export interface Content {
  meta: {
    title: string;
    /** Max 155 characters. */
    description: string;
  };
  profile: {
    name: string;
    fullName: string;
    initials: string;
    title: string;
    headline: string;
    intro: string;
    status: string;
    /**
     * Roles cycled by the typewriter after the hero status line. The first one is rendered
     * statically without JS and under prefers-reduced-motion.
     */
    roles: string[];
    heroChips: string[];
    about: [string, string];
    facts: LabeledValue[];
    contact: {
      email: string;
      linkedin: string;
      linkedinLabel: string;
      github: string;
      githubLabel: string;
      instagram: string;
      /** Handle shown in the Contact details and on the personal panel's button. */
      instagramLabel: string;
      timezone: string;
    };
    contactHeadline: string;
    contactText: string;
    footerTagline: string;
  };
  ui: {
    nav: {
      about: string;
      skills: string;
      projects: string;
      journey: string;
      impact: string;
      cta: string;
    };
    viewProjects: string;
    contactMe: string;
    allRepos: string;
    emailMe: string;
    linkedin: string;
    backTop: string;
    /** Accessible name of the navbar logo link; starts with the visible initials (WCAG 2.5.3). */
    logoLabel: string;
    /** Row labels of the Contact details list. */
    contact: {
      email: string;
      linkedin: string;
      github: string;
      instagram: string;
      timezone: string;
    };
    menuOpen: string;
    menuClose: string;
    language: string;
    /** aria-label for the main <nav> landmarks. */
    navLabel: string;
    /** 404 page: heading, one line of copy and the button back to the locale's homepage. */
    notFoundTitle: string;
    notFoundText: string;
    notFoundBack: string;
  };
  /** "Beyond the code" dialog, opened by clicking the name in the navbar or the hero intro. */
  personal: {
    title: string;
    body: string;
    photoAlt: string;
    /** aria-label of the navbar name button; starts with the visible name (WCAG 2.5.3). */
    open: string;
    /** aria-label of the dialog's close button. */
    close: string;
  };
  sections: {
    about: SectionHeader;
    skills: SectionHeader;
    projects: SectionHeader;
    journey: SectionHeader;
    impact: SectionHeader;
    contact: SectionHeader;
  };
  diagram: {
    nodes: { title: string; sub: string }[];
    center: string;
    centerSub: string;
    caption: string;
    ariaLabel: string;
  };
  skills: {
    title: string;
    description: string;
    chips: string[];
    icon: SkillIcon;
  }[];
  projects: {
    slug: string;
    name: string;
    kind: string;
    period?: string;
    description: string;
    stack: string[];
    /** Display-ready value, formatted for the locale (e.g. "9,000+" in EN, "9.000+" in PT/ES). */
    metrics?: { value: string; label: string }[];
    links: Link[];
    tier: ProjectTier;
  }[];
  journey: {
    period: string;
    place?: string;
    title: string;
    org: string;
    /** Secondary note shown after the org in muted text, e.g. the contracting company. */
    orgNote?: string;
    description: string;
    /** Filled cobalt dot when true, hollow when false. */
    current: boolean;
    type: JourneyType;
  }[];
  achievements: {
    /** Display-ready value, formatted for the locale (e.g. "9,000+" in EN, "9.000+" in PT/ES). */
    metrics: { value: string; label: string; note: string }[];
    items: {
      icon: AchievementIcon;
      title: string;
      description: string;
    }[];
  };
}
