import getWorkspaces from "get-workspaces"
import semver from "semver"
import path from "path"
import mm from "micromatch"
import {
	Workspace,
	WorkspaceMap,
	WorkspaceGraph,
	Options,
	dependencyTypes,
} from "../types"

const localPrefixes = ["file:", "workspace:"]

export function arrify<T>(value: undefined | T | T[]): T[] {
	if (typeof value === "undefined") {
		return []
	} else if (Array.isArray(value)) {
		return value
	} else {
		return [value]
	}
}

function matchesPatterns(
	str: string,
	patterns: string[],
	emptyShouldMatch: boolean,
) {
	if (patterns.length === 0) {
		return emptyShouldMatch
	} else {
		return mm.any(str, patterns)
	}
}

function matchesDependency(match: Workspace, depVersion: string): boolean {
	const versionMatch = semver.satisfies(match.config.version, depVersion)
	const localDep = localPrefixes.some(prefix => depVersion.startsWith(prefix))
	return versionMatch || localDep
}

export async function getFilteredWorkspaces(
	opts: Options,
): Promise<Workspace[]> {
	let workspaces = await getWorkspaces({ cwd: opts.cwd })
	if (!workspaces) {
		throw new Error(`Could not find any workspaces from ${opts.cwd}`)
	}

	let only = arrify(opts.only)
	let onlyFs = arrify(opts.onlyFs)
	let ignore = arrify(opts.ignore)
	let ignoreFs = arrify(opts.ignoreFs)

	let filteredWorkspaces = workspaces.filter(workspace => {
		if (!matchesPatterns(workspace.name, only, true)) return false
		if (matchesPatterns(workspace.name, ignore, false)) return false
		let relativeDir = path.relative(opts.cwd, workspace.dir)
		if (!matchesPatterns(relativeDir, onlyFs, true)) return false
		if (matchesPatterns(relativeDir, ignoreFs, false)) return false
		return true
	})

	return filteredWorkspaces
}

export function getWorkspaceGraph(
	workspaces: Workspace[],
	opts: Options,
): WorkspaceGraph {
	let depTypes = Array.isArray(opts.orderByDeps)
		? opts.orderByDeps
		: dependencyTypes

	let workspaceMap: WorkspaceMap = {}
	for (let workspace of workspaces) {
		workspaceMap[workspace.name] = workspace
	}

	let workspaceGraph = new Map()

	for (let workspace of Object.values(workspaceMap)) {
		let dependencies = []

		for (let depType of depTypes) {
			let deps = workspace.config[depType]

			if (!deps) {
				continue
			}

			for (let [depName, depVersion] of Object.entries(deps)) {
				let match = workspaceMap[depName]

				if (!match) {
					continue
				}

				if (!matchesDependency(match, depVersion)) {
					continue
				}

				dependencies.push(match)
			}
		}

		workspaceGraph.set(workspace, dependencies)
	}

	return workspaceGraph
}
