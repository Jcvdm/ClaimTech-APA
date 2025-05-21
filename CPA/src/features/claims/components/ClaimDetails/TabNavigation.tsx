"use client";

// src/features/claims/components/ClaimDetails/TabNavigation.tsx
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type ClaimTabValue } from '../../hooks/useClaimTabs';
import {
  FileText,
  Calendar,
  Search,
  ClipboardList,
  FileQuestion,
  History
} from 'lucide-react';

interface TabNavigationProps {
  activeTab: ClaimTabValue;
}

// Note: This array is not currently used in the component, but kept for reference
const tabs: { value: ClaimTabValue; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'pre-incident', label: 'Pre-Incident' },
  { value: 'history', label: 'History' },
];

export function TabNavigation({ activeTab }: TabNavigationProps) {
  return (
    <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
      <TabsTrigger value="summary" className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        <span className="hidden md:inline">Summary</span>
      </TabsTrigger>

      <TabsTrigger value="appointment" className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        <span className="hidden md:inline">Appointment</span>
      </TabsTrigger>

      <TabsTrigger value="inspection" className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Inspection</span>
      </TabsTrigger>

      <TabsTrigger value="estimate" className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4" />
        <span className="hidden md:inline">Estimate</span>
      </TabsTrigger>

      <TabsTrigger value="pre-incident" className="flex items-center gap-2">
        <FileQuestion className="h-4 w-4" />
        <span className="hidden md:inline">Pre-Incident</span>
      </TabsTrigger>

      <TabsTrigger value="history" className="flex items-center gap-2">
        <History className="h-4 w-4" />
        <span className="hidden md:inline">History</span>
      </TabsTrigger>
    </TabsList>
  );
}
