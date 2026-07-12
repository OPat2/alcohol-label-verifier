import axios from 'axios';
import type { ApiResponse, VerificationResult, ApplicationData } from '@shared/types';

const API_URL = (import.meta as any).env?.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

// Add token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

export const authService = {
  login: async (email: string, password: string) => {
    const response = await client.post<ApiResponse<any>>('/auth/login', { email, password });
    if (response.data.data?.token) {
      localStorage.setItem('authToken', response.data.data.token);
    }
    return response.data.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
  },

  getToken: () => localStorage.getItem('authToken'),
};

export const labelService = {
  verifyLabel: async (
    labelImage: File,
    applicationData: Partial<ApplicationData>,
  ): Promise<VerificationResult> => {
    const formData = new FormData();
    formData.append('labelImage', labelImage);
    formData.append('applicationData', JSON.stringify(applicationData));

    const response = await client.post<ApiResponse<VerificationResult>>(
      '/labels/verify',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data!;
  },
};

export const batchService = {
  uploadBatchSync: async (
    images: File[],
    applicationDataList: Partial<ApplicationData>[],
  ) => {
    const formData = new FormData();
    images.forEach((file) => formData.append('labels', file));
    formData.append('applicationData', JSON.stringify(applicationDataList));

    const response = await client.post<ApiResponse<any>>('/batch/sync', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
    });
    return response.data.data!;
  },

  getBatchStatus: async (batchId: string) => {
    const response = await client.get<ApiResponse<any>>(`/batch/${batchId}`);
    return response.data.data!;
  },

  downloadBatchCsv: async (batchId: string): Promise<Blob> => {
    const response = await client.get(`/batch/${batchId}/export/csv`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadBatchJson: async (batchId: string): Promise<Blob> => {
    const response = await client.get(`/batch/${batchId}/export/json`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const complianceService = {
  getReport: async () => {
    const response = await client.get<ApiResponse<any>>('/compliance/report');
    return response.data.data;
  },

  getWarningText: async () => {
    const response = await client.get<ApiResponse<any>>('/compliance/warning-text');
    return response.data.data;
  },
};
