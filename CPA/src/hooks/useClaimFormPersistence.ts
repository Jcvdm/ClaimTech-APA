'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { FormStatus } from '@/components/inspection/StatusBadge';
import { debounce } from '@/lib/utils';
import { FormValues } from '@/app/claims/new/schema';

const PERSISTENCE_KEY = 'claim-form-state';
const SELECT_FIELDS = ['client_id', 'province_id', 'assigned_to_employee_id', 'instruction', 'type_of_loss', 'party_type'];

export function useClaimFormPersistence(
  formId: string,
  initialData: FormValues,
  form: any
) {
  const [formData, setFormData] = useState<FormValues>(initialData);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [lastSavedData, setLastSavedData] = useState<FormValues>(initialData);
  const queryClient = useQueryClient();

  // Add a dedicated state for select field values
  const [selectFieldValues, setSelectFieldValues] = useState<Record<string, string>>({});

  // Add a ref to track if we've loaded persisted data
  const hasLoadedPersistedData = useRef(false);

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

  // Enhanced load from localStorage function
  const loadPersistedData = useCallback(() => {
    if (typeof window !== 'undefined' && !hasLoadedPersistedData.current) {
      try {
        // Try to get data from multiple sources
        const persistedDataString = localStorage.getItem(`${PERSISTENCE_KEY}-${formId}`);
        const backupSelectFieldsString = localStorage.getItem(`${PERSISTENCE_KEY}-${formId}-select-fields`);

        // If we don't have any persisted data, return early
        if (!persistedDataString && !backupSelectFieldsString) return;

        // Parse the persisted data
        let persistedData;
        let data = {};
        let backupSelectFields = {};

        // Try to parse the main data
        if (persistedDataString) {
          try {
            persistedData = JSON.parse(persistedDataString);
            // Handle both new and legacy format
            if (persistedData.version) {
              data = persistedData.data || {};
              backupSelectFields = persistedData.selectFields || {};
            } else {
              data = persistedData || {};
            }
          } catch (e) {
            console.error('Failed to parse persisted data:', e);
            // Continue anyway, we might have backup data
          }
        }

        // Try to parse the backup select fields
        if (backupSelectFieldsString) {
          try {
            const parsedBackupFields = JSON.parse(backupSelectFieldsString);
            // Merge with existing backup fields, preferring the dedicated backup
            backupSelectFields = { ...backupSelectFields, ...parsedBackupFields };
          } catch (e) {
            console.error('Failed to parse backup select fields:', e);
          }
        }

        // Also check sessionStorage for even more recent values
        SELECT_FIELDS.forEach(key => {
          const sessionValue = sessionStorage.getItem(`select-value-${key}`);
          if (sessionValue) {
            console.log(`[useClaimFormPersistence] Found session value for ${key}:`, sessionValue);
            backupSelectFields[key] = sessionValue;
          }
        });

        console.log("[useClaimFormPersistence] Loading persisted data:", data);
        console.log("[useClaimFormPersistence] Backup select fields:", backupSelectFields);

        // Update the form with the persisted data
        Object.keys(data).forEach(key => {
          // Skip null or undefined values
          if (data[key] === null || data[key] === undefined) return;

          // Handle date fields specially
          if (key === 'date_of_loss' && data[key]) {
            form.setValue(key, new Date(data[key]), { shouldValidate: false });
          }
          // Handle other fields
          else if (!SELECT_FIELDS.includes(key)) {
            form.setValue(key, data[key], { shouldValidate: false });
          }
        });

        // Handle select fields separately with special care
        SELECT_FIELDS.forEach(key => {
          // Try to get the value from various sources, in order of preference
          const sessionValue = sessionStorage.getItem(`select-value-${key}`);
          const backupValue = backupSelectFields[key];
          const dataValue = data[key];
          const localStorageValue = localStorage.getItem(`select-backup-${key}`);

          // Use the first available value
          const value = sessionValue || backupValue || dataValue || localStorageValue || '';

          if (value) {
            console.log(`[useClaimFormPersistence] Setting select field ${key} to:`, value);

            // Use setTimeout to ensure the form is fully initialized
            setTimeout(() => {
              // Set the value in multiple ways to ensure it sticks
              form.setValue(key, value, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: false // Don't validate to avoid UI disruption
              });

              // Also update our dedicated state
              setSelectFieldValues(prev => ({
                ...prev,
                [key]: value
              }));

              // Store in sessionStorage for more immediate recovery
              sessionStorage.setItem(`select-value-${key}`, value);

              // Store in localStorage as a backup
              localStorage.setItem(`select-backup-${key}`, value);
            }, 0);
          }
        });

        // Set form data and status
        setFormData(data);
        setLastSavedData(data);
        setStatus('idle');
        hasLoadedPersistedData.current = true;

        // Schedule a validation pass after everything is loaded
        setTimeout(() => {
          form.trigger();
        }, 500);
      } catch (error) {
        console.error('Failed to load persisted data:', error);
        // Don't set error status here to avoid UI disruption
      }
    }
  }, [form, formId]);

  // Call loadPersistedData on mount and when formId changes
  useEffect(() => {
    loadPersistedData();
  }, [loadPersistedData]);

  // Enhanced save to localStorage function
  const saveToLocalStorage = useCallback(
    debounce((data: FormValues) => {
      if (typeof window !== 'undefined') {
        try {
          // Create a clean copy of the data to save
          const dataToSave = { ...data };

          // Special handling for select fields
          SELECT_FIELDS.forEach(key => {
            if (key in dataToSave) {
              // Log the value being saved
              console.log(`[useClaimFormPersistence] Saving select field ${key}:`, dataToSave[key]);

              // IMPORTANT: Never convert values for select fields
              // This ensures we maintain the exact value

              // Also store in sessionStorage for more immediate recovery
              if (dataToSave[key]) {
                sessionStorage.setItem(`select-value-${key}`, dataToSave[key]);
              }

              // Update our dedicated state for all values (even empty ones)
              setSelectFieldValues(prev => ({
                ...prev,
                [key]: dataToSave[key]
              }));
            }
          });

          // Save to localStorage with a version number for future compatibility
          localStorage.setItem(
            `${PERSISTENCE_KEY}-${formId}`,
            JSON.stringify({
              version: '1.0',
              data: dataToSave,
              selectFields: selectFieldValues, // Store select values separately as backup
              timestamp: new Date().toISOString()
            })
          );

          // Also save a separate backup of just the select fields for easier recovery
          localStorage.setItem(
            `${PERSISTENCE_KEY}-${formId}-select-fields`,
            JSON.stringify(selectFieldValues)
          );

          setStatus('saved');
        } catch (error) {
          console.error('Failed to save form data to localStorage:', error);
          setStatus('error');
        }
      }
    }, 300), // Even more reduced debounce time for more responsive saving
    [formId, selectFieldValues]
  );

  // Add a recovery mechanism that periodically checks if select values are lost
  useEffect(() => {
    const interval = setInterval(() => {
      SELECT_FIELDS.forEach(key => {
        const currentValue = form.getValues(key);
        const storedValue = selectFieldValues[key];

        // If we have a stored value but the current form value is empty, restore it
        if (storedValue && !currentValue) {
          console.log(`[useClaimFormPersistence] Recovering lost select value for ${key}:`, storedValue);
          form.setValue(key, storedValue, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: false // Don't validate to avoid UI disruption
          });
        }
      });
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [form, selectFieldValues]);

  // Subscribe to form changes
  useEffect(() => {
    const subscription = form.watch((value: any) => {
      console.log("[useClaimFormPersistence] Form value changed:", value);

      // Create a clean copy of the data
      const cleanValue = { ...value };

      // Ensure select fields are properly handled
      SELECT_FIELDS.forEach(key => {
        if (key in cleanValue) {
          // Log the current value
          console.log(`[useClaimFormPersistence] Current value of ${key}:`, cleanValue[key]);

          // IMPORTANT: Don't convert empty strings to null for select fields
          // This was causing issues with the client selection

          // Update our dedicated state if the value exists (even if empty string)
          // This ensures we track all values, not just non-empty ones
          setSelectFieldValues(prev => ({
            ...prev,
            [key]: cleanValue[key]
          }));

          // Also store in sessionStorage for more immediate recovery
          if (typeof window !== 'undefined' && cleanValue[key]) {
            sessionStorage.setItem(`select-value-${key}`, cleanValue[key]);
          }
        }
      });

      setFormData(cleanValue);
      setStatus('unsaved');
      saveToLocalStorage(cleanValue);
    });

    return () => subscription.unsubscribe();
  }, [form, saveToLocalStorage]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    if (typeof window !== 'undefined') {
      console.log(`[useClaimFormPersistence] Clearing persisted data for ${formId}`);
      localStorage.removeItem(`${PERSISTENCE_KEY}-${formId}`);

      // Also clear backup values from localStorage and sessionStorage
      SELECT_FIELDS.forEach(key => {
        localStorage.removeItem(`select-backup-${key}`);
        sessionStorage.removeItem(`select-value-${key}`);
      });

      // Clear the dedicated backup for select fields
      localStorage.removeItem(`${PERSISTENCE_KEY}-${formId}-select-fields`);

      // Reset form to default values
      Object.keys(initialData).forEach(key => {
        // Handle date fields specially
        if (key === 'date_of_loss') {
          form.setValue(key, undefined);
        }
        // Handle select fields specially
        else if (SELECT_FIELDS.includes(key)) {
          form.setValue(key, '');
        }
        // Handle instruction field specially (has a default value)
        else if (key === 'instruction') {
          form.setValue(key, initialData[key]);
        }
        // Handle other fields
        else {
          form.setValue(key, initialData[key] || '');
        }
      });

      setFormData(initialData);
      setLastSavedData(initialData);
      setSelectFieldValues({});
      setStatus('idle');
      hasLoadedPersistedData.current = false;
    }
  }, [formId, initialData, form]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(formData) !== JSON.stringify(lastSavedData);
  }, [formData, lastSavedData]);

  return {
    formData,
    updateFormData: (newData: Partial<FormValues>) => {
      setFormData((prev) => {
        const updated = { ...prev, ...newData };
        setStatus('unsaved');
        saveToLocalStorage(updated);
        return updated;
      });
    },
    status,
    hasUnsavedChanges,
    clearPersistedData,
    selectFieldValues
  };
}
