import { Workspace } from "get-workspaces"
export { Workspace }

export let dependencyTypes = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const

export type DependencyType = typeof dependencyTypes[number]

export type WorkspaceMap = { [key: string]: Workspace }
export type WorkspaceGraph = Map<Workspace, Workspace[]>
export type WorkspaceTask = (
	workspace: Workspace,
	allWorkspaces: Workspace[],
) => Promise<void>

export type Parallelism = boolean | number | "physical-cores"

export interface Options {
	cwd: string
	parallel?: Parallelism
	orderByDeps?: boolean | DependencyType[]
	continueOnError?: boolean
	only?: string | string[]
	ignore?: string | string[]
	onlyFs?: string | string[]
	ignoreFs?: string | string[]
}
