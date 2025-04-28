"use client";

import { useState, useEffect } from "react";
import { useLatestPost, useCreatePost } from "@/lib/api/domains/posts";

export function LatestPost() {
	// Use the custom hooks from our data access layer
	const { data: latestPost, status } = useLatestPost();

	const [name, setName] = useState("");
	const createPost = useCreatePost();

	// Reset the form after successful post creation
	useEffect(() => {
		if (createPost.isSuccess) {
			setName("");
		}
	}, [createPost.isSuccess]);

	return (
		<div className="w-full max-w-xs">
			{status === "loading" ? (
				<p>Loading post...</p>
			) : latestPost ? (
				<p className="truncate">Your most recent post: {latestPost.name}</p>
			) : (
				<p>You have no posts yet.</p>
			)}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					createPost.mutate({ name });
				}}
				className="flex flex-col gap-2"
			>
				<input
					type="text"
					placeholder="Title"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
				/>
				<button
					type="submit"
					className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
					disabled={createPost.isPending}
				>
					{createPost.isPending ? "Submitting..." : "Submit"}
				</button>
			</form>
		</div>
	);
}
