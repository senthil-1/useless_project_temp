import { z } from "zod";

export const VALID_MINISTRY_DEPARTMENTS = [
  "Department of Excessive Waiting",
  "Department of Unnecessary Paperwork",
  "Department of Minor Inconveniences",
  "Department of Lost Things",
  "Department of Government Confusion",
  "Department of Administrative Delays",
  "Department of Completely Unnecessary Requests",
  "Department of Public Complaints",
  "Department of Bureaucratic Affairs",
  "Department of Miscellaneous Uselessness",
] as const;

export type MinistryDepartment = (typeof VALID_MINISTRY_DEPARTMENTS)[number];

export const ALL_DEPARTMENTS_FILTER = ["All Departments", ...VALID_MINISTRY_DEPARTMENTS] as const;

export const RawGeminiNoticeSchema = z.object({
  department: z.string().refine(
    (val) => (VALID_MINISTRY_DEPARTMENTS as readonly string[]).includes(val),
    {
      message: "Department must be an officially recognized Ministry department",
    }
  ),
  title: z.string().min(5, "Title must be at least 5 characters").max(180, "Title cannot exceed 180 characters"),
  message: z.string().min(20, "Message must be at least 20 characters").max(1200, "Message cannot exceed 1200 characters"),
  priority: z.enum(["Normal", "Important", "Urgent"]),
  category: z.string().min(2, "Category must be at least 2 characters").max(80, "Category cannot exceed 80 characters"),
  validDays: z.coerce.number().int().min(1).max(90).default(7),
});

export const GeminiNoticeBatchSchema = z.array(RawGeminiNoticeSchema).min(6).max(15);

export interface StoredMinistryNotice {
  id: string;
  title: string;
  department: string;
  message: string;
  priority: "Normal" | "Important" | "Urgent";
  category: string;
  publishedAt: string;
  expiresAt: string | null;
  createdAt?: any;
  generatedBy: "gemini";
}
