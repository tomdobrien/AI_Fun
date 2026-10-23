export interface Experience { employer: string; role: string; startDate: string | null; endDate: string | null; description: string | null; highlights: string[]; }
export interface SelectedWork { title: string; summary: string | null; technologies: string[]; url: string | null; }
export interface Skill { name: string; category: string | null; }
export interface ProfileLink { label: string; url: string; }
export interface Profile { displayName: string | null; headline: string | null; introduction: string | null; experience: Experience[]; selectedWork: SelectedWork[]; skills: Skill[]; links: ProfileLink[]; }
