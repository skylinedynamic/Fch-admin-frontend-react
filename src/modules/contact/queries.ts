import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query/queryKeys';
import { createContact, deleteContact, fetchContactById, fetchContacts, updateContact } from './services';
import type { Contact, ContactFilterParams } from './types';

export const useContacts = (params: ContactFilterParams = {}) => {
    return useQuery({
        queryKey: [...queryKeys.contact.list(), params],
        queryFn: () => fetchContacts(params),
    });
};

export const useContact = (id: string | number, enabled = true) => {
    return useQuery({
        queryKey: queryKeys.contact.detail(id),
        queryFn: () => fetchContactById(id),
        enabled,
    });
};

export const useCreateContact = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: FormData | Contact) => createContact(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.contact.list() });
        },
    });
};

export const useUpdateContact = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: string | number; payload: FormData | Partial<Contact> }) => updateContact(id, payload),
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: queryKeys.contact.detail(variables.id) });
            qc.invalidateQueries({ queryKey: queryKeys.contact.list() });
        },
    });
};

export const useDeleteContact = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string | number) => deleteContact(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.contact.list() });
        },
    });
};
