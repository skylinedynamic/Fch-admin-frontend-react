import { apiClient } from '../../lib/http/apiClient'
import type { Borrower } from './types'

export const fetchBorrowers = async (): Promise<Borrower[]> => {
  const { data } = await apiClient.get('/borrowers')
  return data
}

export const fetchBorrowerById = async (id: string | number): Promise<Borrower> => {
  const { data } = await apiClient.get(`/borrowers/${id}`)
  return data
}

export const createBorrower = async (payload: Partial<Borrower>): Promise<Borrower> => {
  const { data } = await apiClient.post('/borrowers', payload)
  return data
}

export const updateBorrower = async (id: string | number, payload: Partial<Borrower>): Promise<Borrower> => {
  const { data } = await apiClient.put(`/borrowers/${id}`, payload)
  return data
}

export const deleteBorrower = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/borrowers/${id}`)
}

export const fetchAllBorrowers = async (payload: any = {}) => {
  const { data } = await apiClient.post('/common/borrowers/fetch-all-borrowers', payload);
  return data;
};

// Get all users (for dropdowns like sales person filter)
export const getAllUsers = async () => {
  const { data } = await apiClient.post('/common/borrowers/get-all-users');
  return data;
};