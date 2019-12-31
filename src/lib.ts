import { Options, WorkspaceTask } from "./types"
import { getFilteredWorkspaces } from "./utils/workspaces"
import { runTask } from "./utils/tasks"

export default async function workspacesRun(
	opts: Options,
	task: WorkspaceTask,
) {
	await runTask(await getFilteredWorkspaces(opts), opts, task)
}
