/**
 * AI话术训练系统 - API服务
 */

import apiClient from '../utils/apiClient';

// ============ 类型定义 ============

export interface AITrainingLevel {
  id?: number;
  name: string;
  description: string;
  pass_score: number;
  sort_order: number;
  status: number; // 1=启用 0=禁用
  learning_material?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AITrainingQuestion {
  id?: number;
  level_id: number;
  scenario: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  score_a: number;
  score_b: number;
  score_c: number;
  score_d: number;
  correct_answer: string;
  analysis: string;
  sort_order?: number;
  created_at?: string;
}

export interface AITrainingScenario {
  id?: number;
  name: string;
  personality_type: string;
  description: string;
  initial_intent: string;
  difficulty: string;
  opening: string;
  personality_traits?: string; // JSON string
  skill_tips?: string;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AITrainingScript {
  id?: number;
  category: string;
  personality_type: string;
  scenario: string;
  content: string;
  tags?: string;
  usage_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AIDashboardStats {
  total_participants: number;
  total_levels: number;
  total_scenarios: number;
  average_score: number;
  level_completion_rates: { level_name: string; completion_rate: number }[];
  scenario_usage_stats: { scenario_name: string; count: number }[];
}

export interface AIRankingItem {
  rank: number;
  user_id: number;
  nickname: string;
  avatar?: string;
  total_score: number;
  completed_levels: number;
  level?: number;
}

// ============ 关卡 API ============

export const levelApi = {
  getLevels: () => apiClient.get('/ai-training/levels'),
  getLevel: (id: number) => apiClient.get(`/ai-training/levels/${id}`),
  createLevel: (data: Partial<AITrainingLevel>) => apiClient.post('/ai-training/levels', data),
  updateLevel: (id: number, data: Partial<AITrainingLevel>) => apiClient.put(`/ai-training/levels/${id}`, data),
  deleteLevel: (id: number) => apiClient.delete(`/ai-training/levels/${id}`),
  toggleLevelStatus: (id: number, status: number) => apiClient.put(`/ai-training/levels/${id}/status`, { status }),
};

// ============ 题目 API ============

export const questionApi = {
  getQuestions: (levelId: number) => apiClient.get(`/ai-training/levels/${levelId}/questions`),
  createQuestion: (levelId: number, data: Partial<AITrainingQuestion>) =>
    apiClient.post(`/ai-training/levels/${levelId}/questions`, data),
  updateQuestion: (levelId: number, questionId: number, data: Partial<AITrainingQuestion>) =>
    apiClient.put(`/ai-training/levels/${levelId}/questions/${questionId}`, data),
  deleteQuestion: (levelId: number, questionId: number) =>
    apiClient.delete(`/ai-training/levels/${levelId}/questions/${questionId}`),
};

// ============ 场景 API ============

export const scenarioApi = {
  getScenarios: (params?: { personality_type?: string; difficulty?: string }) =>
    apiClient.get('/ai-training/scenarios', { params }),
  getScenario: (id: number) => apiClient.get(`/ai-training/scenarios/${id}`),
  createScenario: (data: Partial<AITrainingScenario>) => apiClient.post('/ai-training/scenarios', data),
  updateScenario: (id: number, data: Partial<AITrainingScenario>) => apiClient.put(`/ai-training/scenarios/${id}`, data),
  deleteScenario: (id: number) => apiClient.delete(`/ai-training/scenarios/${id}`),
};

// ============ 话术库 API ============

export const scriptApi = {
  getScripts: (params?: { category?: string; personality_type?: string }) =>
    apiClient.get('/ai-training/scripts', { params }),
  getScript: (id: number) => apiClient.get(`/ai-training/scripts/${id}`),
  createScript: (data: Partial<AITrainingScript>) => apiClient.post('/ai-training/scripts', data),
  updateScript: (id: number, data: Partial<AITrainingScript>) => apiClient.put(`/ai-training/scripts/${id}`, data),
  deleteScript: (id: number) => apiClient.delete(`/ai-training/scripts/${id}`),
};

// ============ 数据报表 API ============

export const dashboardApi = {
  getStats: () => apiClient.get('/ai-training/dashboard/stats'),
  getRankings: (params?: { limit?: number }) =>
    apiClient.get('/ai-training/rankings', { params }),
};
