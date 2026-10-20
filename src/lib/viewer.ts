import { useRouteLoaderData } from "react-router";

/** Who is signed in, as loaded once per page by the root route (src/root.tsx). */
export type Viewer = { name: string | null; email: string | null; role: "learner" | "admin"; companyRole: "owner" | "member" | null; canLearn: boolean } | null;

export const useViewer = () => (useRouteLoaderData("root") as { viewer: Viewer } | undefined)?.viewer ?? null;
