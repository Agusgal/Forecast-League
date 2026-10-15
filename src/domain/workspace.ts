import { z } from "zod";
import { questionDraftSchema, type QuestionDraft } from "./schemas";

export const planSchema = z.enum(["free", "pro", "community", "enterprise"]);
export type Plan = z.infer<typeof planSchema>;
export const plans = {
  free: { name: "Free", dailyQuestions: 1, priority: "normal" },
  pro: { name: "Pro", dailyQuestions: 10, priority: "priority" },
  community: { name: "Community", dailyQuestions: 10, priority: "priority" },
  enterprise: { name: "Enterprise", dailyQuestions: 10, priority: "priority" },
} as const;
export const canCreateCommunities = (plan: Plan) => plan === "community" || plan === "enterprise";
export const quotaDay = (now: Date) => new Date(now.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
export const quotaReset = (now: Date) => new Date(Date.parse(`${quotaDay(now)}T03:00:00Z`) + 86400_000).toISOString();
const id = z.string().trim().min(1).max(120);
const comment = z.string().trim().min(5).max(1000);
export const workspaceActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("propose"), question: questionDraftSchema, communityId: id.optional() }).strict(),
  z.object({ action: z.literal("review"), proposalId: id, decision: z.enum(["approve", "reject"]), note: comment }).strict(),
  z.object({ action: z.literal("set_plan"), userId: id, plan: planSchema }).strict(),
  z.object({ action: z.literal("create_community"), name: z.string().trim().min(3).max(60), description: z.string().trim().min(10).max(500) }).strict(),
  z.object({ action: z.literal("join_community"), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,16}$/) }).strict(),
  z.object({ action: z.literal("set_curator"), communityId: id, userId: id, enabled: z.boolean() }).strict(),
  z.object({ action: z.literal("create_survey"), communityId: id, title: z.string().trim().min(10).max(180), purpose: z.string().trim().min(20).max(1000), options: z.array(z.string().trim().min(1).max(100)).min(2).max(6), closesAt: z.iso.datetime({ offset: true }) }).strict().refine((v) => new Set(v.options.map((x) => x.toLowerCase())).size === v.options.length, {message: "Las opciones deben ser distintas."}),
  z.object({ action: z.literal("answer_survey"), surveyId: id, optionIndex: z.number().int().min(0).max(5), consent: z.literal(true) }).strict(),
  z.object({ action: z.literal("withdraw_survey"), surveyId: id }).strict(),
]);
export type WorkspaceAction = z.infer<typeof workspaceActionSchema>;
export interface QuestionProposal {
  id: string; userId: string; username: string; question: QuestionDraft;
  communityId: string | null; plan: Plan; priority: "normal" | "priority";
  status: "pending" | "approved" | "rejected"; submittedAt: string;
  reviewedAt: string | null; reviewedBy: string | null; reviewNote: string;
  publishedQuestionId: string | null;
}
export interface ActivityAnalytics {
  participants: number; forecasts: number; resolvedForecasts: number;
  meanBrier: number | null; suppressed: boolean;
  byCategory: { category: string; count: number; meanBrier: number }[];
}
export interface CommunityView {
  id: string; name: string; description: string; code: string; ownerId: string;
  members: { userId: string; username: string; role: "owner" | "curator" | "member" }[];
  questionIds: string[]; analytics: ActivityAnalytics | null;
}
export interface SurveyView {
  id: string; communityId: string; ownerId: string; title: string; purpose: string;
  options: string[]; closesAt: string; createdAt: string; answered: boolean; acceptingResponses: boolean;
  ownOptionIndex: number | null;
  results: { responses: number; counts: number[] | null; suppressed: boolean } | null;
}
export interface WorkspaceState {
  plan: Plan; registered: boolean;
  quota: { limit: number; used: number; remaining: number; resetsAt: string; timeZone: string };
  proposals: QuestionProposal[]; reviewQueue: QuestionProposal[];
  accounts: { userId: string; username: string; plan: Plan }[];
  communities: CommunityView[]; surveys: SurveyView[];
  analytics: (ActivityAnalytics & { registeredUsers: number }) | null;
}
