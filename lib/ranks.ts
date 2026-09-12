export const OFFICIAL_RANKS = [
  { minPoints: 1500, maxPoints: Infinity, name: "Grandmaster of Useless Affairs" },
  { minPoints: 1000, maxPoints: 1499, name: "Supreme Minister of Nothing" },
  { minPoints: 750, maxPoints: 999, name: "Chief Excuse Officer" },
  { minPoints: 500, maxPoints: 749, name: "Director of Pointless Operations" },
  { minPoints: 300, maxPoints: 499, name: "Master of Missing Documents" },
  { minPoints: 150, maxPoints: 299, name: "Senior Waiter of Affairs" },
  { minPoints: 50, maxPoints: 149, name: "Certified Form Filler" },
  { minPoints: 0, maxPoints: 49, name: "Officially Unnecessary" },
] as const;

export type OfficialRank = typeof OFFICIAL_RANKS[number]["name"];

/**
 * Calculates the official citizen rank based strictly on uselessPoints.
 * 
 * 0–49 points    -> "Officially Unnecessary"
 * 50–149 points  -> "Certified Form Filler"
 * 150–299 points -> "Senior Waiter of Affairs"
 * 300–499 points -> "Master of Missing Documents"
 * 500–749 points -> "Director of Pointless Operations"
 * 750–999 points -> "Chief Excuse Officer"
 * 1000–1499 pts  -> "Supreme Minister of Nothing"
 * 1500+ points   -> "Grandmaster of Useless Affairs"
 */
export function getRank(points: number): string {
  const pts = typeof points === "number" && !isNaN(points) ? points : 0;
  if (pts >= 1500) return "Grandmaster of Useless Affairs";
  if (pts >= 1000) return "Supreme Minister of Nothing";
  if (pts >= 750) return "Chief Excuse Officer";
  if (pts >= 500) return "Director of Pointless Operations";
  if (pts >= 300) return "Master of Missing Documents";
  if (pts >= 150) return "Senior Waiter of Affairs";
  if (pts >= 50) return "Certified Form Filler";
  return "Officially Unnecessary";
}

/**
 * Returns progression info for moving up to the next official rank.
 */
export function getNextRank(points: number): {
  nextRank: string | null;
  pointsNeeded: number;
  currentRank: string;
} {
  const pts = typeof points === "number" && !isNaN(points) ? points : 0;
  const currentRank = getRank(pts);

  if (pts >= 1500) {
    return { nextRank: null, pointsNeeded: 0, currentRank };
  }
  if (pts >= 1000) {
    return { nextRank: "Grandmaster of Useless Affairs", pointsNeeded: 1500 - pts, currentRank };
  }
  if (pts >= 750) {
    return { nextRank: "Supreme Minister of Nothing", pointsNeeded: 1000 - pts, currentRank };
  }
  if (pts >= 500) {
    return { nextRank: "Chief Excuse Officer", pointsNeeded: 750 - pts, currentRank };
  }
  if (pts >= 300) {
    return { nextRank: "Director of Pointless Operations", pointsNeeded: 500 - pts, currentRank };
  }
  if (pts >= 150) {
    return { nextRank: "Master of Missing Documents", pointsNeeded: 300 - pts, currentRank };
  }
  if (pts >= 50) {
    return { nextRank: "Senior Waiter of Affairs", pointsNeeded: 150 - pts, currentRank };
  }
  return { nextRank: "Certified Form Filler", pointsNeeded: 50 - pts, currentRank };
}

/**
 * Reconciles citizen statistics across local cache and server data,
 * and dynamically evaluates the citizen's official rank.
 */
export function calculateCitizenStats(
  uid: string,
  existingData?: { applicationCount?: number; uselessPoints?: number; [key: string]: any } | null
): { applicationCount: number; uselessPoints: number; rank: string } {
  let incidentCount = 0;
  let certCount = 0;

  if (typeof window !== "undefined" && uid) {
    try {
      const incs = JSON.parse(localStorage.getItem(`mua_incidents_${uid}`) || "[]");
      incidentCount = Array.isArray(incs) ? incs.length : 0;
    } catch {}
    try {
      const certs = JSON.parse(localStorage.getItem(`mua_certificates_${uid}`) || "[]");
      certCount = Array.isArray(certs) ? certs.length : 0;
    } catch {}
  }

  const localApps = incidentCount + certCount;
  const localPoints = incidentCount * 10 + certCount * 20;

  const rawApps = typeof existingData?.applicationCount === "number" ? existingData.applicationCount : 0;
  const rawPoints = typeof existingData?.uselessPoints === "number" ? existingData.uselessPoints : 0;

  const applicationCount = Math.max(rawApps, localApps);
  const uselessPoints = Math.max(rawPoints, localPoints);
  const rank = getRank(uselessPoints);

  return { applicationCount, uselessPoints, rank };
}
