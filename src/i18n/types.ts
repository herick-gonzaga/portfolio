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
export type TerminalCommand =
  | 'help'
  | 'about'
  | 'skills'
  | 'projects'
  | 'journey'
  | 'contact'
  | 'languages'
  | 'sudo hire-me'
  | 'clear';

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
      /** Row with the live Brazil (UTC−3) clock, after the time zone. */
      localTime: string;
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
  /**
   * Interactive terminal in the Contact section (src/components/Terminal.astro). Command names
   * stay in English in every locale, like a real shell; everything printed is localized.
   */
  terminal: {
    /** Accessible name of the terminal window. */
    label: string;
    /** Mono line above the window that invites visitors to try it. */
    intro: string;
    /** Visually hidden label of the command input. */
    inputLabel: string;
    /** Printed when the terminal first renders; `{help}` is replaced by the highlighted command. */
    welcome: string;
    /** Label before the quick-command buttons under the window. */
    quick: string;
    /** One-line description of each command, listed by `help`. */
    commands: Record<TerminalCommand, string>;
    /** Footer line of `help`: keyboard shortcuts. */
    helpTip: string;
    /** 2–3 lines printed by `about`. */
    about: string[];
    /** Printed by `languages`, one per line. */
    languages: { name: string; level: string }[];
    /** Playful lines printed by `sudo hire-me` before the mail client opens. */
    hire: string[];
    /** Last line of `sudo hire-me`, before the mailto link. */
    hireOpening: string;
    /** Subject of the email opened by `sudo hire-me`. */
    hireSubject: string;
    /** "command not found" (printed as "<input>: command not found"). */
    notFound: string;
    /** Hint after an unknown command; `{help}` is replaced by the highlighted command. */
    notFoundHint: string;
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
    /** One-line summary printed by the Contact terminal's `projects` command. */
    tagline: string;
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
