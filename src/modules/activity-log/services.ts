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

export const createActivity = async (data: Partial<ActivityLog>) => {
    const response = await apiClient.post("/common/activity-logs/activity", data);
    return response.data;
};

export const createEmailLog = async (data: Partial<ActivityLog>) => {
    const response = await apiClient.post("/common/activity-logs/email", data);
    return response.data;
};
