import { apiClient } from '../../lib/http/apiClient';
import type { Contact, ContactFilterParams, FetchContactsResponse, ContactResponse } from './types';

// Fetch Contacts List
export const fetchContacts = async (params: ContactFilterParams = {}): Promise<FetchContactsResponse> => {
    const { data } = await apiClient.post(`/common/contacts/fetch-contacts`, params);
    return data;
};

// Fetch Single Contact
export const fetchContactById = async (id: string | number): Promise<Contact> => {
    const { data } = await apiClient.get(`/common/contacts/${id}`);
    return data.data;
};

// Create Contact
export const createContact = async (payload: FormData | Contact): Promise<ContactResponse> => {
    const { data } = await apiClient.post('/common/contacts', payload);
    return data;
};

// Update Contact
export const updateContact = async (id: string | number, payload: FormData | Partial<Contact>): Promise<ContactResponse> => {
    const { data } = await apiClient.put(`/common/contacts/${id}`, payload);
    return data;
};

// Delete Contact
export const deleteContact = async (id: string | number): Promise<{ status: boolean; message: string }> => {
    const { data } = await apiClient.delete(`/common/contacts/${id}`);
    return data;
};

// Multiple Delete
export const deleteContacts = async (ids: (string | number)[]): Promise<{ status: boolean; message: string }> => {
    const { data } = await apiClient.post(`/common/contacts/multiple-delete`, { ids });
    return data;
};
