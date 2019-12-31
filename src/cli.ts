import meow from "meow"
import chalk from "chalk"
import redent from "redent"
import trimNewlines from "trim-newlines"
import workspacesRun from "./lib"
import { Options, dependencyTypes, DependencyType, Parallelism } from "./types"
import { spawnCommand } from "./utils/spawn"
import { AggregateTaskError } from "./utils/tasks"
import { ChildProcessFailedError } from "./utils/spawn"

let helpText = trimNewlines(
	redent(`
		Usage
			$ workspaces-run [flags] -- <command> [...args]

		Flags
			--parallel                   Run across workspaces in parallel
			--parallel=<maxParallelism>  Specify the number of parallel processes to spawn
			--parallel=physical-cores    Use the number of physical CPU cores as the number of parallel processes to spawn
			--order-by-deps              Only run a command on a workspace if other workspaces in its dependencies have already finished running.
			--order-by-deps=<depTypes>   Same as \`--order-by-deps\`, but only consider certain dependency types (dependencies, devDependencies, etc)
			--continue-on-error          Do not exit until the command has run on all workspaces, regardless if some failed.
			--no-prefix                  Do not prefix stdout/stderr lines with the workspace name
			--help                       Help
			--version                    Version info

		Filtering Flags (can be specified multiple times)
			--only <pattern>             *Only* run on packages with **names** matching these patterns
			--only-fs <pattern>          *Only* run on packages with **paths** matching these patterns.
			--ignore <pattern>           *Ignore* packages with **names** matching these patterns.
			--ignore-fs <pattern>        *Ignore* packages with **paths** matching these patterns.

		For more info on patterns see: https://github.com/micromatch/micromatch#matching-features
	`),
)

class CLIUsageError extends Error {}

function toCmdAndArgs(flag: unknown): [string, string[]] {
	if (Array.isArray(flag)) {
		let cmd: string | null = flag[0] || null
		let args = flag.slice(1)
		if (typeof cmd !== "string") {
			throw new CLIUsageError("workspaces-run needs a command to run")
		}
		return [cmd, args]
	}
	throw new CLIUsageError("Unexpected value for -- <command> [...args]")
}

function toParallel(flag: unknown): Parallelism {
	if (typeof flag === "undefined") return false
	if (typeof flag === "boolean") return flag
	if (flag === "physical-cores") return "physical-cores"
	if (typeof flag === "string") {
		let value = parseInt(flag, 10)
		if (!Number.isNaN(value)) return value
	}
	if (typeof flag === "number") {
		if (!Number.isNaN(flag)) return flag
	}
	throw new CLIUsageError("Unexpected value for --[no-]parallel")
}

function toDependencyTypes(arr: string[]): DependencyType[] {
	return arr.map<DependencyType>(item => {
		if (dependencyTypes.includes(item as DependencyType)) {
			return item as DependencyType
		} else {
			throw new CLIUsageError("Unexpected dependency type in --order-by-deps")
		}
	})
}

function toOrderByDeps(flag: unknown): boolean | DependencyType[] {
	if (typeof flag === "undefined") return false
	if (typeof flag === "boolean") return flag
	if (typeof flag === "string") return toDependencyTypes([flag])
	if (Array.isArray(flag)) return toDependencyTypes(flag)
	throw new CLIUsageError("Unexpected value for --[no-]order-by-deps")
}

function toContinueOnError(flag: unknown): boolean {
	if (typeof flag === "undefined") return false
	if (typeof flag === "boolean") return flag
	throw new CLIUsageError("Unexpected value for --[no-]continue-on-error")
}

function toPrefix(flag: unknown): boolean {
	if (typeof flag === "undefined") return true
	if (typeof flag === "boolean") return flag
	throw new CLIUsageError("Unexpected value for --[no-]prefix")
}

function toFilter(flag: unknown, name: string): string[] {
	if (typeof flag === "undefined") return []
	if (typeof flag === "string") return [flag]
	if (Array.isArray(flag)) {
		return flag.map(item => {
			if (typeof item === "string") {
				return item
			} else {
				throw new CLIUsageError(`Unexpected value for --${name}`)
			}
		})
	}
	throw new CLIUsageError(`Unexpected value for --${name}`)
}

export async function run(cwd: string, argv: string[]) {
	let cli = meow({
		argv,
		help: helpText,
		flags: {
			"--": true,
		},
	})

	let [cmd, args] = toCmdAndArgs(cli.flags["--"])
	let parallel: Parallelism = toParallel(cli.flags.parallel)
	let orderByDeps: boolean | DependencyType[] = toOrderByDeps(
		cli.flags.orderByDeps,
	)
	let continueOnError: boolean = toContinueOnError(cli.flags.continueOnError)
	let shouldPrefix: boolean = toPrefix(cli.flags.prefix)

	let only: string[] = toFilter(cli.flags.only, "only")
	let onlyFs: string[] = toFilter(cli.flags.onlyFs, "only-fs")
	let ignore: string[] = toFilter(cli.flags.ignore, "ignore")
	let ignoreFs: string[] = toFilter(cli.flags.ignoreFs, "ignore-fs")

	let opts: Options = {
		cwd,
		parallel,
		orderByDeps,
		continueOnError,
		only,
		onlyFs,
		ignore,
		ignoreFs,
	}

	await workspacesRun(opts, async (workspace, workspaces) => {
		await spawnCommand(workspace, cmd, args, workspaces, shouldPrefix)
	})
}

export function reportError(error: Error) {
	if (error instanceof CLIUsageError) {
		console.error("\n" + chalk.red(error.message) + "\n")
		console.error(helpText)
	} else if (error instanceof AggregateTaskError) {
		// ignore
	} else if (error instanceof ChildProcessFailedError) {
		// ignore
	} else {
		console.error(error)
	}
}
