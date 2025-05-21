'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { FormStatus } from '@/components/inspection/StatusBadge';
import { debounce } from '@/lib/utils';

const PERSISTENCE_KEY = 'inspection-form-state';

export function useFormPersistence<T>(
  formId: string,
  initialData: T,
  onSave: (data: T) => Promise<void>
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [lastSavedData, setLastSavedData] = useState<T>(initialData);
  const queryClient = useQueryClient();

  // Initialize persistence
  useEffect(() => {
    const localStoragePersister = createSyncStoragePersister({
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      key: `${PERSISTENCE_KEY}-${formId}`,
    });

    // Only run this in the browser
    if (typeof window !== 'undefined') {
      persistQueryClient({
        queryClient,
        persister: localStoragePersister,
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      });
    }
  }, [formId, queryClient]);

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = async () => {
      if (typeof window !== 'undefined') {
        const persistedData = localStorage.getItem(`${PERSISTENCE_KEY}-${formId}`);
        if (persistedData) {
          try {
            const parsedData = JSON.parse(persistedData);
            setFormData(parsedData);
            setLastSavedData(parsedData);
            setStatus('saved');
          } catch (error) {
            console.error('Failed to parse persisted form data:', error);
          }
        }
      }
    };

    loadPersistedData();
  }, [formId]);

  // Auto-save to localStorage
  const saveToLocalStorage = useCallback(
    debounce((data: T) => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`${PERSISTENCE_KEY}-${formId}`, JSON.stringify(data));
          setStatus('saved');
        } catch (error) {
          console.error('Failed to save form data to localStorage:', error);
          setStatus('error');
        }
      }
    }, 1000),
    [formId]
  );

  // Update form data
  const updateFormData = useCallback(
    (newData: Partial<T>) => {
      setFormData((prev) => {
        const updated = { ...prev, ...newData };
        setStatus('unsaved');
        saveToLocalStorage(updated);
        return updated;
      });
    },
    [saveToLocalStorage]
  );

  // Save to server
  const saveToServer = useCallback(async () => {
    try {
      setStatus('saving');
      await onSave(formData);
      setLastSavedData(formData);
      setStatus('saved');
    } catch (error) {
      console.error('Failed to save form data to server:', error);
      setStatus('error');
    }
  }, [formData, onSave]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(lastSavedData);
  }, [formData, lastSavedData]);

  return {
    formData,
    updateFormData,
    saveToServer,
    status,
    hasUnsavedChanges,
  };
}
