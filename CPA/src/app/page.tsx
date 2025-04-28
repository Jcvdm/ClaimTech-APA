import Link from "next/link";

import { LatestPost } from "@/app/_components/post";
import { HydrateClient, api } from "@/trpc/server.server";

export default async function Home() {
	const hello = await api.post.hello({ text: "from tRPC" });

	try {
		void api.post.getLatest.prefetch();
	} catch (error) {
		console.error("Error prefetching latest post:", error);
		// Continue without prefetching
	}

	return (
		<HydrateClient>
			<div className="w-full">
				<h1 className="text-4xl font-bold mb-6">Dashboard</h1>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					<div className="rounded-lg border p-4 shadow-sm">
						<h2 className="text-xl font-semibold mb-2">Quick Links</h2>
						<div className="space-y-2">
							<Link
								className="flex items-center gap-2 text-blue-600 hover:underline"
								href="/claims"
							>
								View Claims
							</Link>
							<Link
								className="flex items-center gap-2 text-blue-600 hover:underline"
								href="/clients"
							>
								Manage Clients
							</Link>
						</div>
					</div>

					<div className="rounded-lg border p-4 shadow-sm">
						<h2 className="text-xl font-semibold mb-2">tRPC Status</h2>
						<p className="text-sm">
							{hello ? hello.greeting : "Loading tRPC query..."}
						</p>
						<div className="mt-4">
							<LatestPost />
						</div>
					</div>
				</div>
			</div>
		</HydrateClient>
	);
}