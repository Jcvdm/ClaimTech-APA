import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

import { TRPCReactProvider } from "@/trpc/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/components/providers/AuthProvider";
import LayoutWithCounts from "./layout-with-counts";

export const metadata: Metadata = {
	title: "CPA - Claims Process App",
	description: "Claims Process Management Application",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<body className="overflow-hidden">
				<TRPCReactProvider>
					<AuthProvider>
						<SidebarProvider defaultOpen={true}>
							{/* LayoutWithCounts includes the server-side claim counts provider */}
							<LayoutWithCounts>{children}</LayoutWithCounts>
						</SidebarProvider>
					</AuthProvider>
				</TRPCReactProvider>
				<Toaster richColors position="top-right" />
			</body>
		</html>
	);
}
