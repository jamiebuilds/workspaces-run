import crossSpawn from "cross-spawn"
import chalk from "chalk"
import wrapline from "wrapline"
import { SpawnOptions, ChildProcess } from "child_process"
import onExit from "signal-exit"
import path from "path"
import { Workspace } from "../types"

let colors = [chalk.cyan, chalk.magenta, chalk.green, chalk.yellow, chalk.blue]

const activeProcesses: Set<ChildProcess> = new Set()

onExit((_code, signal) => {
	for (let child of activeProcesses) {
		if (signal) {
			child.kill(signal as NodeJS.Signals)
		} else {
			child.kill("SIGTERM")
		}
	}
})

export class ChildProcessFailedError extends Error {}

type Spy = (data: Buffer | string) => void
let __spy: Spy | null = null

export function __spyOnSpawnCommand(cb: Spy) {
	__spy = cb
	return () => {
		__spy = null
	}
}

let childIndex = 0

export function spawnCommand(
	workspace: Workspace,
	cmd: string,
	args: string[],
	workspaces: Workspace[],
	shouldPrefix: boolean,
) {
	return new Promise((resolve, reject) => {
		let nodeModulesBinPath = path.join(workspace.dir, "node_modules", ".bin")
		let padding = workspaces.reduce((memo, workspace) => {
			return memo > workspace.name.length ? memo : workspace.name.length
		}, 0)

		let opts: SpawnOptions = {
			stdio: "pipe",
			shell: true,
			cwd: workspace.dir,
			env: {
				...process.env,
				PATH: `${nodeModulesBinPath}:${process.env.PATH}`,
			},
		}

		let child = crossSpawn(cmd, args, opts)

		activeProcesses.add(child)

		let color = colors[childIndex++ % colors.length]
		let prefix = shouldPrefix
			? color(workspace.name.padEnd(padding) + " │ ")
			: ""

		if (child.stdout) {
			child.stdout.pipe(wrapline(prefix)).on("data", (data: string) => {
				if (__spy) {
					__spy(data)
				} else {
					process.stdout.write(data)
				}
			})
		}

		if (child.stderr) {
			child.stderr.pipe(wrapline(prefix)).on("data", (data: string) => {
				if (__spy) {
					__spy(data)
				} else {
					process.stderr.write(data)
				}
			})
		}

		child.on("error", err => {
			activeProcesses.delete(child)
			reject(err)
		})

		child.on("close", (code, _signal) => {
			activeProcesses.delete(child)
			if (code === 0) {
				resolve()
			} else {
				reject(new ChildProcessFailedError())
			}
		})
	})
}
