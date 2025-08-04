import { postRouter } from "@/server/api/routers/post";
import { claimRouter } from "@/server/api/routers/claim";
import { clientRouter } from "@/server/api/routers/client";
import { vehicleRouter } from "@/server/api/routers/vehicle";
import { attachmentRouter } from "@/server/api/routers/attachment";
import { appointmentRouter } from "@/server/api/routers/appointment";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { lookupRouter } from "@/server/api/routers/lookup";
import { inspectionRouter } from "@/server/api/routers/inspection";
import { logRouter } from "@/server/api/routers/log";
import { estimateRouter } from "@/server/api/routers/estimate";
import { estimateBulkRouter } from "@/server/api/routers/estimate-bulk";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	post: postRouter,
	claim: claimRouter,
	client: clientRouter,
	vehicle: vehicleRouter,
	attachment: attachmentRouter,
	appointment: appointmentRouter,
	lookup: lookupRouter,
	inspection: inspectionRouter,
	log: logRouter,
	estimate: estimateRouter,
	estimateBulk: estimateBulkRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
