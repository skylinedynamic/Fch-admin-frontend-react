import { apiClient } from "../../lib/http/apiClient";
import type { ActivityLog, ActivityParams } from "./types";

export const getActivityLogs = async (params: ActivityParams = {}) => {
    const response = await apiClient.get("/common/activity-logs", { params });
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
