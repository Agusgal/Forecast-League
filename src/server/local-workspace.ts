import { randomBytes, randomUUID } from "node:crypto";
import { brierScore, selectScoringRevision } from "@/domain/scoring";
import {
  canCreateCommunities, plans, quotaDay, quotaReset, workspaceActionSchema,
  type ActivityAnalytics, type Plan, type QuestionProposal, type WorkspaceAction,
  type WorkspaceState,
} from "@/domain/workspace";
import type { Profile } from "@/domain/types";
import type { LocalData } from "./local-store";
import { invariant } from "./errors";

interface CommunityRecord {
  id: string; name: string; description: string; code: string; ownerId: string;
  members: { userId: string; role: "owner" | "curator" | "member" }[];
}
interface SurveyRecord {
  id: string; communityId: string; ownerId: string; title: string; purpose: string;
  options: string[]; closesAt: string; createdAt: string;
  responses: { userId: string; optionIndex: number | null; consentedAt: string | null; withdrawnAt: string | null }[];
}
/** Private storage. Only explicit read models below may leave the server. */
export interface LocalWorkspaceData {
  plans: Record<string, Plan>;
  proposals: QuestionProposal[];
  communities: CommunityRecord[];
  surveys: SurveyRecord[];
}
const emptyWorkspace = (): LocalWorkspaceData => ({ plans: {}, proposals: [], communities: [], surveys: [] });
const planFor = (workspace: LocalWorkspaceData, user: Profile | null): Plan =>
  user?.isRegistered ? workspace.plans[user.id] ?? "free" : "free";
const usage = (workspace: LocalWorkspaceData, userId: string | undefined, now: Date) =>
  workspace.proposals.filter((proposal) => proposal.userId === userId && quotaDay(new Date(proposal.submittedAt)) === quotaDay(now)).length;

/** Accuracy requires five distinct registered people, independently per category. */
function analytics(data: LocalData, userIds: Set<string>, questionIds: Set<string>): ActivityAnalytics {
  const questions = data.questions.filter((question) => questionIds.has(question.id) && question.status !== "DRAFT");
  const scored: { userId: string; category: string; brier: number }[] = [];
  const participants = new Set<string>();
  let forecasts = 0;
  for (const userId of userIds) {
    const revisions = data.revisions.filter((row) => row.userId === userId);
    for (const question of questions) {
      const revision = selectScoringRevision(revisions, question);
      if (!revision) continue;
      forecasts += 1;
      participants.add(userId);
      if (question.status === "RESOLVED" && question.outcome !== null) {
        scored.push({ userId, category: question.category, brier: brierScore(revision.probability, question.outcome) });
      }
    }
  }
  const suppressed = new Set(scored.map((row) => row.userId)).size < 5;
  const mean = (rows: typeof scored) => rows.reduce((sum, row) => sum + row.brier, 0) / rows.length;
  const byCategory = [...new Set(scored.map((row) => row.category))].flatMap((category) => {
    const rows = scored.filter((row) => row.category === category);
    return new Set(rows.map((row) => row.userId)).size < 5 ? [] : [{ category, count: rows.length, meanBrier: mean(rows) }];
  }).sort((a, b) => a.category.localeCompare(b.category));
  return { participants: participants.size, forecasts, resolvedForecasts: scored.length, meanBrier: suppressed ? null : mean(scored), suppressed, byCategory };
}

export function workspaceView(data: LocalData, user: Profile | null, now: Date): WorkspaceState {
  const workspace = data.workspace ?? emptyWorkspace();
  const registered = Boolean(user?.isRegistered);
  const plan = planFor(workspace, user);
  const used = registered ? usage(workspace, user!.id, now) : 0;
  const registeredIds = new Set((data.accounts ?? []).map((account) => account.userId));
  const isAdmin = registered && user!.isAdmin;
  const communities = registered ? workspace.communities.filter((community) => community.members.some((member) => member.userId === user!.id)).map((community) => {
    const questionIds = workspace.proposals.filter((proposal) => proposal.communityId === community.id && proposal.status === "approved" && proposal.publishedQuestionId).map((proposal) => proposal.publishedQuestionId!);
    return {
      id: community.id, name: community.name, description: community.description, code: community.code, ownerId: community.ownerId,
      members: community.members.map((member) => ({ ...member, username: data.profiles.find((profile) => profile.id === member.userId)?.username ?? "Participante" })),
      questionIds,
      analytics: community.ownerId === user!.id && canCreateCommunities(plan)
        ? analytics(data, new Set(community.members.map((member) => member.userId).filter((id) => registeredIds.has(id))), new Set(questionIds)) : null,
    };
  }) : [];
  const surveys = workspace.surveys.filter((survey) => communities.some((community) => community.id === survey.communityId)).map((survey) => {
    const response = survey.responses.find((row) => row.userId === user!.id);
    const owner = survey.ownerId === user!.id && plan === "enterprise";
    const activeResponses = survey.responses.filter((row) => row.optionIndex !== null);
    const suppressed = activeResponses.length < 5;
    return {
      id: survey.id, communityId: survey.communityId, ownerId: survey.ownerId, title: survey.title, purpose: survey.purpose,
      options: [...survey.options], closesAt: survey.closesAt, createdAt: survey.createdAt,
      answered: Boolean(response), ownOptionIndex: response?.optionIndex ?? null,
      acceptingResponses: workspace.plans[survey.ownerId] === "enterprise" && Date.parse(survey.closesAt) > now.getTime() && !response,
      results: owner ? {
        responses: activeResponses.length, suppressed,
        counts: suppressed ? null : survey.options.map((_, index) => activeResponses.filter((row) => row.optionIndex === index).length),
      } : null,
    };
  });
  return {
    plan, registered,
    quota: { limit: plans[plan].dailyQuestions, used, remaining: Math.max(0, plans[plan].dailyQuestions - used), resetsAt: quotaReset(now), timeZone: "America/Argentina/Cordoba" },
    proposals: registered ? structuredClone(workspace.proposals.filter((proposal) => proposal.userId === user!.id).toSorted((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))) : [],
    reviewQueue: isAdmin ? structuredClone(workspace.proposals.filter((proposal) => proposal.status === "pending").toSorted((a, b) => Number(b.priority === "priority") - Number(a.priority === "priority") || Date.parse(a.submittedAt) - Date.parse(b.submittedAt))) : [],
    accounts: isAdmin ? (data.accounts ?? []).map((account) => ({ userId: account.userId, username: data.profiles.find((profile) => profile.id === account.userId)?.username ?? "Participante", plan: workspace.plans[account.userId] ?? "free" })) : [],
    communities, surveys,
    analytics: registered && plan === "enterprise" ? { ...analytics(data, registeredIds, new Set(data.questions.map((question) => question.id))), registeredUsers: registeredIds.size } : null,
  };
}

export function applyWorkspaceAction(data: LocalData, user: Profile, rawInput: WorkspaceAction, now: Date): void {
  invariant(user.isRegistered, 403, "Creá una cuenta o iniciá sesión para usar esta función.");
  const input = workspaceActionSchema.parse(rawInput);
  const workspace = data.workspace ??= emptyWorkspace();
  const plan = planFor(workspace, user);
  const communityById = (id: string) => {
    const community = workspace.communities.find((row) => row.id === id);
    invariant(community && community.members.some((member) => member.userId === user.id), 404, "Comunidad no encontrada.");
    return community;
  };
  const enterpriseOwner = (id: string) => {
    const community = communityById(id);
    invariant(plan === "enterprise" && community.ownerId === user.id, 403, "Esta función requiere ser propietario con plan Enterprise.");
    return community;
  };
  switch (input.action) {
    case "propose": {
      invariant(Date.parse(input.question.closesAt) > now.getTime(), 409, "La pregunta debe tener un cierre futuro.");
      if (input.communityId) {
        const community = communityById(input.communityId);
        const member = community.members.find((row) => row.userId === user.id)!;
        invariant(member.role === "owner" || member.role === "curator", 403, "Solo el propietario y los curadores pueden proponer para esta comunidad.");
        invariant(member.role === "owner" ? canCreateCommunities(plan) : workspace.plans[community.ownerId] === "enterprise", 403, "El plan del propietario no permite proponer preguntas para esta comunidad.");
      }
      invariant(usage(workspace, user.id, now) < plans[plan].dailyQuestions, 429, "Ya usaste tu cupo de preguntas de hoy. Se renueva a medianoche de Argentina.");
      workspace.proposals.push({
        id: randomUUID(), userId: user.id, username: user.username, question: structuredClone(input.question),
        communityId: input.communityId ?? null, plan, priority: plans[plan].priority,
        status: "pending", submittedAt: now.toISOString(), reviewedAt: null, reviewedBy: null, reviewNote: "", publishedQuestionId: null,
      });
      break;
    }
    case "review": {
      invariant(user.isAdmin, 403, "Se requiere acceso de administración.");
      const proposal = workspace.proposals.find((row) => row.id === input.proposalId);
      invariant(proposal, 404, "Propuesta no encontrada.");
      invariant(proposal.status === "pending", 409, "Esta propuesta ya fue revisada.");
      if (input.decision === "approve") {
        invariant(Date.parse(proposal.question.closesAt) > now.getTime(), 409, "El plazo de la propuesta ya venció; debe rechazarse y enviarse una nueva.");
        const id = randomUUID();
        data.questions.push({ ...structuredClone(proposal.question), id, status: "PUBLISHED", outcome: null, isDemo: true });
        proposal.publishedQuestionId = id;
      }
      proposal.status = input.decision === "approve" ? "approved" : "rejected";
      proposal.reviewedAt = now.toISOString();
      proposal.reviewedBy = user.id;
      proposal.reviewNote = input.note;
      break;
    }
    case "set_plan": {
      invariant(user.isAdmin, 403, "Solo administración puede asignar planes.");
      invariant(data.accounts?.some((account) => account.userId === input.userId), 404, "Cuenta registrada no encontrada.");
      workspace.plans[input.userId] = input.plan;
      break;
    }
    case "create_community": {
      invariant(canCreateCommunities(plan), 403, "Crear comunidades requiere un plan Community o Enterprise.");
      let code: string;
      do { code = randomBytes(5).toString("hex").toUpperCase(); } while (workspace.communities.some((row) => row.code === code));
      workspace.communities.push({ id: randomUUID(), name: input.name, description: input.description, code, ownerId: user.id, members: [{ userId: user.id, role: "owner" }] });
      break;
    }
    case "join_community": {
      const community = workspace.communities.find((row) => row.code === input.code);
      invariant(community, 404, "No existe una comunidad con ese código.");
      if (!community.members.some((member) => member.userId === user.id)) community.members.push({ userId: user.id, role: "member" });
      break;
    }
    case "set_curator": {
      const community = enterpriseOwner(input.communityId);
      const member = community.members.find((row) => row.userId === input.userId);
      invariant(member && member.role !== "owner", 400, "Elegí otro miembro de la comunidad.");
      member.role = input.enabled ? "curator" : "member";
      break;
    }
    case "create_survey": {
      enterpriseOwner(input.communityId);
      invariant(Date.parse(input.closesAt) > now.getTime(), 409, "La encuesta debe tener un cierre futuro.");
      workspace.surveys.push({ id: randomUUID(), communityId: input.communityId, ownerId: user.id, title: input.title, purpose: input.purpose, options: [...input.options], closesAt: input.closesAt, createdAt: now.toISOString(), responses: [] });
      break;
    }
    case "answer_survey": {
      const survey = workspace.surveys.find((row) => row.id === input.surveyId);
      invariant(survey, 404, "Encuesta no encontrada.");
      communityById(survey.communityId);
      invariant(workspace.plans[survey.ownerId] === "enterprise", 403, "La encuesta no está disponible porque su propietario ya no tiene Enterprise.");
      invariant(Date.parse(survey.closesAt) > now.getTime(), 409, "Esta encuesta ya cerró.");
      invariant(!survey.responses.some((row) => row.userId === user.id), 409, "Ya respondiste esta encuesta. Podés retirar tu respuesta.");
      invariant(input.optionIndex < survey.options.length, 400, "La opción elegida no existe.");
      survey.responses.push({ userId: user.id, optionIndex: input.optionIndex, consentedAt: now.toISOString(), withdrawnAt: null });
      break;
    }
    case "withdraw_survey": {
      const survey = workspace.surveys.find((row) => row.id === input.surveyId);
      // A person may revoke consent even after losing community membership.
      const response = survey?.responses.find((row) => row.userId === user.id);
      if (response && response.optionIndex !== null) {
        response.optionIndex = null;
        response.consentedAt = null;
        response.withdrawnAt = now.toISOString();
      }
      break;
    }
  }
}
