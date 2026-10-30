import { useQuery } from '@tanstack/react-query';
import { allUsers } from '../partner/services';

export const activityLogKeys = {
    all: ['activity-log'] as const,
    /** "Assigned To" staff of one partner's team (null = the caller's own team). */
    taskAssignees: (partnerId: number | null, keepIds: number[] = []) =>
        [...activityLogKeys.all, 'task-assignees', partnerId ?? 'own', keepIds] as const,
};

export interface TaskAssignee {
    id: number;
    full_name: string;
    email: string | null;
    phone_number: string | null;
}

interface TeamUser {
    id: number;
    name: string;
    email?: string | null;
    phone_number?: string | null;
}

/**
 * Staff a Task can be assigned to: the team of the partner that owns the
 * record (client, lead, funding application, funding request). With no
 * partner id — the Partner page — the API returns the caller's own team,
 * which for the host is the host's staff. Active staff only, plus `keepIds`
 * (the saved assignee and the record's owner) even if since made inactive.
 * Loaded only while `enabled`.
 */
export const useTaskAssignees = (partnerId: number | null, enabled: boolean, keepIds: number[] = []) => {
    const keep = [...new Set(keepIds)].sort((a, b) => a - b);

    return useQuery({
        queryKey: activityLogKeys.taskAssignees(partnerId, keep),
        queryFn: async (): Promise<TaskAssignee[]> => {
            const result = await allUsers({
                ...(partnerId ? { partner_id: partnerId } : {}),
                active_only: true,
                ...(keep.length ? { keep_ids: keep } : {}),
            });
            return result?.status
                ? (result.data || []).map((user: TeamUser) => ({
                    id: user.id,
                    full_name: user.name,
                    email: user.email ?? null,
                    phone_number: user.phone_number ?? null,
                }))
                : [];
        },
        enabled,
        staleTime: 5 * 60 * 1000,
    });
};
