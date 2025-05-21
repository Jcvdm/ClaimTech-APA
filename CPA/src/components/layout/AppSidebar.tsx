"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  FileText,
  Users,
  Car,
  Wrench,
  Settings,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  History,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from "@/components/ui/sidebar";
import { useHybridClaimCounts } from "@/lib/api/domains/claims";

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const pathname = usePathname();

  // Use the hybrid approach that combines server-rendered counts with client-side updates
  const counts = useHybridClaimCounts();

  const navItems = [
    {
      icon: <FileText className="h-4 w-4" />,
      label: "Claims",
      href: "/claims",
      badge: counts.active,
      isActive: pathname === "/claims",
    },
    {
      icon: <AlertTriangle className="h-4 w-4" />,
      label: "Additionals",
      href: "/claims/additionals",
      badge: counts.additionals,
      isActive: pathname === "/claims/additionals",
    },
    {
      icon: <FileCheck className="h-4 w-4" />,
      label: "FRC",
      href: "/claims/frc",
      badge: counts.frc,
      isActive: pathname === "/claims/frc",
    },
    {
      icon: <CheckCircle className="h-4 w-4" />,
      label: "Finalized",
      href: "/claims/finalized",
      badge: counts.finalized,
      isActive: pathname === "/claims/finalized",
    },
    {
      icon: <History className="h-4 w-4" />,
      label: "History",
      href: "/claims/history",
      badge: counts.history,
      isActive: pathname === "/claims/history",
    },
    {
      icon: <Users className="h-4 w-4" />,
      label: "Clients",
      href: "/clients",
      isActive: pathname === "/clients",
    },
    {
      icon: <Wrench className="h-4 w-4" />,
      label: "Repairers",
      href: "/repairers",
      isActive: pathname === "/repairers",
    },
    {
      icon: <Settings className="h-4 w-4" />,
      label: "Settings",
      href: "/settings",
      isActive: pathname === "/settings",
    },
  ];

  return (
    <Sidebar collapsible="icon"> {/* Set collapsible to "icon" to show icons when collapsed */}
      {/* CLAIMTECH Branding Box */}
      <SidebarHeader className="h-16 bg-black text-white flex items-center justify-center p-0 shrink-0">
        {isCollapsed ? (
          <span className="font-bold text-lg">CT</span>
        ) : (
          <span className="font-bold text-lg">CLAIMTECH</span>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={item.isActive}
                tooltip={item.label} // Tooltip will show when collapsed
              >
                <Link href={item.href} prefetch={false} className="flex items-center gap-2">
                  {item.icon}
                  <span className={isCollapsed ? "sr-only" : ""}>{item.label}</span>
                </Link>
              </SidebarMenuButton>

              {/* Add badge if applicable */}
              {item.badge !== undefined && item.badge !== null && (
                <SidebarMenuBadge>
                  {item.badge}
                </SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
