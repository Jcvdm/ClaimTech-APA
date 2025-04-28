"use client";

import React from "react";
import { TopBar } from "./TopBar";
import { AppSidebar } from "./AppSidebar";
import dynamic from "next/dynamic";

const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((mod) => mod.ScrollArea),
  { ssr: false }
);

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden">
      {/* Left side: Fixed sidebar occupying full height */}
      <div className="h-full">
        <AppSidebar />
      </div>

      {/* Right side: Vertical stack of topbar, content, footer */}
      <div className="flex-1 flex flex-col h-full">
        {/* Topbar - only spans the width after sidebar */}
        <TopBar />

        {/* Main content area */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full border border-border bg-card shadow-sm rounded-xl overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-8">
                {children}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer - only spans the width after sidebar */}
        <footer className="h-12 border-t border-border/40 py-2 px-4 md:px-8 shrink-0">
          <div className="flex items-center justify-center h-full md:justify-between">
            <p className="text-balance text-center text-sm text-muted-foreground">
              2024 Claims Process App. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}