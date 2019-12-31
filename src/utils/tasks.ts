import { Workspace, Options, Parallelism, WorkspaceTask } from "../types"
import { getWorkspaceGraph } from "./workspaces"
import physicalCpuCount from "physical-cpu-count"
import taskGraphRunner from "task-graph-runner"
import AggregateError from "aggregate-error"
import pLimit, { Limit } from "p-limit"

export class AggregateTaskError extends AggregateError {}

type InnerWorkspaceTask = (workspace: Workspace) => Promise<void>

export function createTaskLimit(parallelism: Parallelism | void): Limit {
	if (typeof parallelism === "number") {
		return pLimit(parallelism)
	} else if (parallelism === "physical-cores") {
		return pLimit(physicalCpuCount)
	} else if (parallelism === true) {
		return pLimit(Infinity)
	} else {
		return pLimit(1)
	}
}

/**
 * Run task in serial, ignoring the dependency graph.
 */
export async function runTaskInSerial(
	workspaces: Workspace[],
	task: InnerWorkspaceTask,
) {
	for (let workspace of workspaces) {
		await task(workspace)
	}
}

/**
 * Run task in serial, respecting the dependency graph.
 */
export async function runTaskInSerialWithGraph(
	workspaces: Workspace[],
	opts: Options,
	task: InnerWorkspaceTask,
) {
	let workspaceGraph = getWorkspaceGraph(workspaces, opts)
	let workspaceOrder: Workspace[] = []

	await taskGraphRunner({
		graph: workspaceGraph,
		task: (workspace: Workspace) => {
			workspaceOrder.push(workspace)
			return Promise.resolve()
		},
		force: false,
	})

	for (let workspace of workspaceOrder) {
		await task(workspace)
	}
}

/**
 * Run task in parallel, ignoring the dependency graph.
 */
export async function runTaskInParallel(
	workspaces: Workspace[],
	opts: Options,
	task: InnerWorkspaceTask,
) {
	let limit = createTaskLimit(opts.parallel)
	let tasks = []

	for (let workspace of workspaces) {
		tasks.push(limit(() => task(workspace)))
	}

	await Promise.all(tasks)
}

/**
 * Run task in parallel, respecting the dependency graph.
 */
export async function runTaskInParallelWithGraph(
	workspaces: Workspace[],
	opts: Options,
	task: InnerWorkspaceTask,
) {
	let workspaceGraph = getWorkspaceGraph(workspaces, opts)
	let limit = createTaskLimit(opts.parallel)

	await taskGraphRunner({
		graph: workspaceGraph,
		task: workspace => {
			return limit(() => task(workspace))
		},
		force: false,
	})
}

export async function runTask(
	workspaces: Workspace[],
	opts: Options,
	task: WorkspaceTask,
) {
	let errors: any[] = []

	async function innerWorkspaceTask(workspace: Workspace) {
		try {
			await task(workspace, workspaces)
		} catch (err) {
			if (opts.continueOnError) {
				errors.push(err)
			} else {
				throw err
			}
		}
	}

	if (opts.parallel) {
		if (opts.orderByDeps) {
			await runTaskInParallelWithGraph(workspaces, opts, innerWorkspaceTask)
		} else {
			await runTaskInParallel(workspaces, opts, innerWorkspaceTask)
		}
	} else {
		if (opts.orderByDeps) {
			await runTaskInSerialWithGraph(workspaces, opts, innerWorkspaceTask)
		} else {
			await runTaskInSerial(workspaces, innerWorkspaceTask)
		}
	}

	if (errors.length) {
		throw new AggregateTaskError(errors)
	}
}
