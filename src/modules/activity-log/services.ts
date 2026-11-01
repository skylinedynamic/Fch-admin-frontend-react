import { apiClient } from "../../lib/http/apiClient";
import type { ActivityLog, ActivityParams } from "./types";

export const getActivityLogs = async (params: ActivityParams = {}) => {
    const response = await apiClient.post("/common/activity-logs/fetch-all-activities", params);
    return response.data;
};

export const getActivityLog = async (id: number | string): Promise<ActivityLog> => {
    const response = await apiClient.get(`/common/activity-logs/${id}`);
    return response.data;
};

export const createActivityLog = async (data: any) => {
    const response = await apiClient.post("/common/activity-logs", data);
    return response.data;
};

export const downloadActivityAttachment = async (data: { activity_log_id: number | string; path: string }) => {
    const response = await apiClient.post("/common/activity-logs/attachments/download", data, {
        responseType: 'blob'
    });
    return response.data;
};

export const updateActivityLog = async (id: number | string, data: any) => {
    if (data instanceof FormData) {
        data.append('_method', 'PUT');
        const response = await apiClient.post(`/common/activity-logs/${id}`, data);
        return response.data;
    }
    const response = await apiClient.put(`/common/activity-logs/${id}`, data);
    return response.data;
};

export const deleteActivityLog = async (id: number | string) => {
    const response = await apiClient.delete(`/common/activity-logs/${id}`);
    return response.data;
};

// Host-only: reclassify an activity's visibility without touching its
// content — works on rows the caller didn't author, unlike updateActivityLog.
export const updateActivityLogVisibility = async (id: number | string, visibility: string) => {
    const response = await apiClient.patch(`/common/activity-logs/${id}/visibility`, { visibility });
    return response.data;
};

// An assigned Task's status (Open / In Progress / Complete), changed from its
// reminder by the task's creator or assignee - nothing else on the activity.
export const updateActivityTaskStatus = async (id: number | string, taskStatus: string) => {
    const response = await apiClient.patch(`/common/activity-logs/${id}/task-status`, { task_status: taskStatus });
    return response.data;
};
