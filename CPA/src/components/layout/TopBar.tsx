import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, Bell, Settings, HelpCircle, Search, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopBar() {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  // Handle search submission
  const handleSearch = () => {
    if (!searchTerm.trim()) return;

    // If we're on a claims page, update the search parameter
    if (pathname.includes('/claims')) {
      // Navigate to the main claims page with the search term
      router.push(`/claims?search=${encodeURIComponent(searchTerm)}`);
    } else {
      // If not on a claims page, navigate to claims with the search term
      router.push(`/claims?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  // Extract search param from URL when component mounts or pathname changes
  useEffect(() => {
    if (pathname.includes('/claims')) {
      const searchParams = new URLSearchParams(window.location.search);
      const search = searchParams.get('search') || '';
      setSearchTerm(search);
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="mr-2" />

        {/* Logo */}
        <div className="mr-4 flex items-center font-semibold">
          <span className="text-lg">CPA</span>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-md flex items-center">
          <Input
            type="search"
            placeholder="Search claims by job number or reference..."
            className="h-9 w-full md:w-64 lg:w-96"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1"
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center space-x-2">
          <Button size="sm">
            <PlusCircle className="mr-1 h-4 w-4" />
            New
          </Button>
        </div>

        {/* Icon Buttons */}
        <div className="flex items-center space-x-1 ml-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt="User" />
                <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.name || 'My Account'}</DropdownMenuLabel>
            <DropdownMenuItem className="text-xs text-muted-foreground">{user?.email}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}