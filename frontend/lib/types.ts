export interface Experience { employer: string; location: string | null; role: string; workMode: string | null; startDate: string | null; endDate: string | null; responsibilities: string[]; projects: string[]; }
export interface SelectedWork { title: string; summary: string | null; technologies: string[]; url: string | null; }
export interface Skill { name: string; category: string | null; }
export interface ProfileLink { label: string; url: string; }
export interface Award { title: string; organization: string | null; date: string | null; description: string | null; }
export interface Education { institution: string; location: string | null; degree: string; fieldOfStudy: string | null; graduationDate: string | null; }
export interface Profile { displayName: string | null; headline: string | null; introduction: string | null; location: string | null; contactEmail: string | null; contactPhone: string | null; experience: Experience[]; selectedWork: SelectedWork[]; skills: Skill[]; links: ProfileLink[]; awards: Award[]; education: Education[]; }
export interface UploadUser { id: number; email: string; displayName: string | null; createdAt: string; active: boolean; }
export interface UploadInvitation { id: number; email: string; displayName: string | null; expiresAt: string; accepted: boolean; revoked: boolean; expired: boolean; }
export interface UploadInviteDetails { email: string; displayName: string | null; expiresAt: string; }
export interface StoredFile { id?: string; filename: string; bytes?: number; modifiedAt?: string; mediaType?: "image" | "video"; }
export interface StoredFileList { accountName: string; email: string | null; files: StoredFile[]; }
