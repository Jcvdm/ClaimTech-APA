import Link from "next/link";

export default function Home() {
	return (
		<div className="w-full">
			<h1 className="text-4xl font-bold mb-6">CPA Dashboard</h1>

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
					<h2 className="text-xl font-semibold mb-2">Welcome to CPA</h2>
					<p className="text-sm text-gray-600">
						Automotive Physical Assessment Claims Processing Application
					</p>
				</div>
			</div>
		</div>
	);
}
