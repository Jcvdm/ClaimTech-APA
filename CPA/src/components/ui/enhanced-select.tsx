'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Controller } from "react-hook-form";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Option {
  id: string;
  name: string;
}

interface EnhancedSelectProps {
  name: string;
  label: string;
  control: any;
  options: Option[];
  isLoading?: boolean;
  isError?: boolean;
  isRequired?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onValueChange?: (value: string) => void;
}

export function EnhancedSelect({
  name,
  label,
  control,
  options,
  isLoading = false,
  isError = false,
  isRequired = false,
  disabled = false,
  placeholder,
  className,
  onValueChange
}: EnhancedSelectProps) {
  // Keep local state to ensure value persistence
  const [localValue, setLocalValue] = useState<string>('');

  // Add a ref to track if we've initialized the component
  const isInitialized = useRef(false);

  // Add a ref to track the last selected value
  const lastSelectedValue = useRef<string>('');

  // Add a ref to track if we're currently handling a value change
  const isChangingValue = useRef(false);

  // Add an interval ID ref for the value check interval
  const valueCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Log initial props for debugging
  useEffect(() => {
    console.log(`[EnhancedSelect] Initial props for ${name}:`, {
      options,
      defaultValue: options.find(option => option.id === control._defaultValues?.[name])?.name || 'none'
    });
  }, []);

  // Store the value in localStorage as a backup
  useEffect(() => {
    if (localValue) {
      localStorage.setItem(`select-backup-${name}`, localValue);
      // Also store in sessionStorage for more immediate recovery
      sessionStorage.setItem(`select-value-${name}`, localValue);
      // Update our last selected value ref
      lastSelectedValue.current = localValue;
    }
  }, [localValue, name]);

  // We'll set up the periodic check inside the Controller render prop
  // where we have access to the field methods
  useEffect(() => {
    // Clear any existing interval on unmount
    return () => {
      if (valueCheckIntervalRef.current) {
        clearInterval(valueCheckIntervalRef.current);
      }
    };
  }, []);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        // Initialize the component on first render
        useEffect(() => {
          if (!isInitialized.current) {
            // Try to recover the value from various sources
            const formValue = field.value;
            const storedValue = localStorage.getItem(`select-backup-${name}`);
            const sessionValue = sessionStorage.getItem(`select-value-${name}`);

            // Use the first available value
            const valueToUse = formValue || sessionValue || storedValue || '';

            if (valueToUse) {
              console.log(`[EnhancedSelect] Initializing ${name} with value:`, valueToUse);

              // Update local state
              setLocalValue(valueToUse);

              // Update last selected value ref
              lastSelectedValue.current = valueToUse;

              // Update form value if needed
              if (!formValue || formValue !== valueToUse) {
                field.onChange(valueToUse);
              }
            }

            isInitialized.current = true;
          }
        }, []);

        // Set up a periodic check to ensure the value is maintained
        useEffect(() => {
          // Clear any existing interval
          if (valueCheckIntervalRef.current) {
            clearInterval(valueCheckIntervalRef.current);
          }

          // Set up a new interval to check the value every 500ms
          valueCheckIntervalRef.current = setInterval(() => {
            // Skip if we're currently handling a value change
            if (isChangingValue.current) return;

            // Get the current form value
            const currentFormValue = field.value;

            // If we have a last selected value but the form value is empty or different, restore it
            if (lastSelectedValue.current && (!currentFormValue || currentFormValue !== lastSelectedValue.current)) {
              console.log(`[EnhancedSelect] Value check: Restoring ${name} from ${currentFormValue} to ${lastSelectedValue.current}`);

              // Set changing flag to prevent recursive updates
              isChangingValue.current = true;

              // Update the form value
              field.onChange(lastSelectedValue.current);

              // Reset the changing flag after a short delay
              setTimeout(() => {
                isChangingValue.current = false;
              }, 100);
            }
          }, 500);

          // Clean up the interval on unmount
          return () => {
            if (valueCheckIntervalRef.current) {
              clearInterval(valueCheckIntervalRef.current);
            }
          };
        }, [field]);

        // Update local state when field value changes
        useEffect(() => {
          if (field.value && field.value !== localValue) {
            console.log(`[EnhancedSelect] Field value updated: ${name} = ${field.value}`);
            setLocalValue(field.value);
            lastSelectedValue.current = field.value;
          }
        }, [field.value]);

        // Prevent value loss on re-render
        const [selectKey, setSelectKey] = useState(`select-${name}-${Date.now()}`);
        const valueRef = useRef(field.value || localValue || lastSelectedValue.current || '');

        // Function to get the display name for the current value
        const getSelectedOptionName = () => {
          const currentValue = valueRef.current || field.value || '';
          if (!currentValue) return '';

          const selectedOption = options.find(option => option.id === currentValue);
          return selectedOption ? selectedOption.name : '';
        };

        // Update the ref when the value changes
        useEffect(() => {
          // Log the current values for debugging
          console.log(`[EnhancedSelect] Updating valueRef for ${name}:`, {
            fieldValue: field.value,
            localValue,
            lastSelectedValue: lastSelectedValue.current
          });

          if (field.value) {
            valueRef.current = field.value;
          } else if (localValue) {
            valueRef.current = localValue;
          } else if (lastSelectedValue.current) {
            valueRef.current = lastSelectedValue.current;
          }

          // Force a re-render to ensure the value is displayed
          setSelectKey(`select-${name}-${Date.now()}`);
        }, [field.value, localValue, name]);

        const handleValueChange = (value: string) => {
          console.log(`[EnhancedSelect] ${name} changed to: ${value}`);

          // Set changing flag to prevent interval updates
          isChangingValue.current = true;

          // Update local state
          setLocalValue(value);
          valueRef.current = value;
          lastSelectedValue.current = value;

          // Update form
          field.onChange(value);

          // Mark field as touched and dirty
          field.onBlur();

          // Force a re-render of the select component with a new key
          setSelectKey(`select-${name}-${Date.now()}`);

          // Call custom handler if provided
          if (onValueChange) {
            onValueChange(value);
          }

          // Store in localStorage and sessionStorage immediately
          localStorage.setItem(`select-backup-${name}`, value);
          sessionStorage.setItem(`select-value-${name}`, value);

          // Reset the changing flag after a short delay
          setTimeout(() => {
            isChangingValue.current = false;

            // Double-check that the value was set correctly
            if (field.value !== value) {
              console.warn(`[EnhancedSelect] Value mismatch for ${name}. Expected: ${value}, Got: ${field.value}`);

              // Try setting it again
              field.onChange(value);
            }
          }, 100);
        };

        return (
          <FormItem className={className}>
            <FormLabel>
              {label} {isRequired && <span className="text-destructive">*</span>}
            </FormLabel>
            <Select
              key={selectKey}
              disabled={disabled || isLoading}
              onValueChange={handleValueChange}
              value={valueRef.current || field.value || ''}
              defaultValue={valueRef.current || field.value || control._defaultValues?.[name] || ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`}>
                    {getSelectedOptionName()}
                  </SelectValue>
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading...</span>
                    </div>
                  </SelectItem>
                ) : isError ? (
                  <SelectItem value="error" disabled>
                    Error loading options
                  </SelectItem>
                ) : options.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    No options available
                  </SelectItem>
                ) : (
                  options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {fieldState.error && !control._formState.isSubmitted && <FormMessage>{fieldState.error.message}</FormMessage>}
            {/* Debug display - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground mt-1">
                <span>Value: {valueRef.current || field.value || 'none'}</span>
                {(valueRef.current || field.value) && (
                  <span className="ml-2">({getSelectedOptionName()})</span>
                )}
              </div>
            )}
          </FormItem>
        );
      }}
    />
  );
}
