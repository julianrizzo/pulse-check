export type LevelRole =
  | "Graduate"
  | "Consultant"
  | "SeniorConsultant"
  | "Manager"
  | "SeniorManager"
  | "Director"
  | "ManagingDirector"
  | "Partner";

export const LEVELS: LevelRole[] = [
  "Graduate",
  "Consultant",
  "SeniorConsultant",
  "Manager",
  "SeniorManager",
  "Director",
  "ManagingDirector",
  "Partner",
];

const LEVEL_INDEX = new Map<LevelRole, number>(
  LEVELS.map((level, index) => [level, index])
);

function toComparable(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function coerceLevelRole(input: unknown): LevelRole | null {
  if (typeof input !== "string") return null;
  const normalized = toComparable(input);
  switch (normalized) {
    case "graduate":
      return "Graduate";
    case "consultant":
      return "Consultant";
    case "senior consultant":
    case "seniorconsultant":
      return "SeniorConsultant";
    case "manager":
      return "Manager";
    case "senior manager":
    case "seniormanager":
      return "SeniorManager";
    case "director":
      return "Director";
    case "managing director":
    case "managingdirector":
      return "ManagingDirector";
    case "partner":
      return "Partner";
    default:
      return null;
  }
}

export function levelRoleLabel(level: LevelRole) {
  switch (level) {
    case "SeniorConsultant":
      return "Senior Consultant";
    case "SeniorManager":
      return "Senior Manager";
    case "ManagingDirector":
      return "Managing Director";
    default:
      return level;
  }
}

export function isManagerOrAbove(level: LevelRole) {
  return LEVEL_INDEX.get(level)! >= LEVEL_INDEX.get("Manager")!;
}

export function canReviewPeer(reviewer: LevelRole, reviewee: LevelRole) {
  return LEVEL_INDEX.get(reviewee)! < LEVEL_INDEX.get(reviewer)!;
}

