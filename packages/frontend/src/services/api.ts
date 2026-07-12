import axios from 'axios';
import type { ApiResponse, VerificationResult, ApplicationData, BatchStatus } from '@shared/types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Add token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
    applicationData: ApplicationData,
  ): Promise<VerificationResult> => {
    const formData = new FormData();
    formData.append('labelImage', labelImage);
    formData.append('applicationData', JSON.stringify(applicationData));

    const response = await client.post<ApiResponse<VerificationResult>>(
      '/labels/verify',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data.data!;
  },
};

export const batchService = {
  uploadBatch: async (labels: File[], applicationDataList: ApplicationData[]) => {
    const formData = new FormData();
    labels.forEach((file) => formData.append('labels', file));
    formData.append('applicationData', JSON.stringify(applicationDataList));

    const response = await client.post<ApiResponse<BatchStatus>>(
      '/batch/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return response.data.data!;
  },

  getBatchStatus: async (batchId: string): Promise<BatchStatus> => {
    const response = await client.get<ApiResponse<BatchStatus>>(`/batch/${batchId}`);
    return response.data.data!;
  },
};

export const complianceService = {
  getReport: async () => {
    const response = await client.get<ApiResponse<any>>('/compliance/report');
    return response.data.data;
  },
};
