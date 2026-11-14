export const PLATFORM_DOMAINS = [
  "Healthcare",
  "AI/ML",
  "Civic Tech",
  "Climate",
  "FinTech",
  "Education",
  "Data",
] as const;

export const PREFERRED_ROLES = [
  "Frontend",
  "Backend",
  "AI/ML",
  "UI/UX",
  "Data",
  "Product",
  "Presentation",
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "flexible", label: "Flexible" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "limited", label: "Limited" },
] as const;

// Allowed hackathon status transitions (the backend is the authoritative source of truth for validation)
export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["published", "archived"],
  published: ["draft", "active", "archived"],
  active: ["completed", "archived"],
  completed: ["archived"],
  archived: ["draft"],
};
