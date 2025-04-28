import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

interface TabNavigationProps {
  activeTab: string;
  claimCreationComplete: boolean;
}

export function TabNavigation({ activeTab, claimCreationComplete }: TabNavigationProps) {
  const tabs = [
    { id: "claim-info", label: "Claim Info" },
    { id: "owner-details", label: "Owner Details" },
    { id: "vehicle-details", label: "Vehicle Details" },
    { id: "location-details", label: "Location" },
    { id: "adjuster-details", label: "Adjuster" },
    { id: "attachments", label: "Attachments" },
  ];

  // Function to determine if a tab is completed
  const isTabCompleted = (tabId: string) => {
    if (claimCreationComplete) return true;
    
    const tabOrder = tabs.map(tab => tab.id);
    const activeTabIndex = tabOrder.indexOf(activeTab);
    const tabIndex = tabOrder.indexOf(tabId);
    
    return tabIndex < activeTabIndex;
  };

  // Function to determine if a tab is disabled
  const isTabDisabled = (tabId: string) => {
    if (tabId === "attachments") return !claimCreationComplete;
    
    const tabOrder = tabs.map(tab => tab.id);
    const activeTabIndex = tabOrder.indexOf(activeTab);
    const tabIndex = tabOrder.indexOf(tabId);
    
    // Only allow navigating to previous tabs or the current tab
    return tabIndex > activeTabIndex;
  };

  return (
    <TabsList className="grid grid-cols-6 mb-8">
      {tabs.map((tab, index) => (
        <TabsTrigger
          key={tab.id}
          value={tab.id}
          disabled={isTabDisabled(tab.id)}
          className={cn(
            "flex items-center gap-2",
            isTabDisabled(tab.id) && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="hidden md:inline">{tab.label}</span>
          <span className="md:hidden">{index + 1}</span>
          {isTabCompleted(tab.id) ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
