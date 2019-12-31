import test from "ava"
import { __spyOnSpawnCommand, ChildProcessFailedError } from "./utils/spawn"
import path from "path"
import AggregateError from "aggregate-error"
import { run } from "./cli"

let cwd = path.join(__dirname, "..", "fixture")
let script = path.join(cwd, "script.sh")

function sleep(ms: number) {
	return new Promise(res => setTimeout(res, ms))
}

async function runCli(order: string[], argv: string[]) {
	let stopSpying = __spyOnSpawnCommand(data => {
		order.push(data.toString().trim())
	})

	try {
		await run(cwd, argv)
		stopSpying()
	} catch (err) {
		stopSpying() // call before sleep
		await sleep(500) // wait for child processes to close. TODO: Fix this shit
		throw err
	}
}

test.serial("defaults", async t => {
	let order = []
	await runCli(order, ["--no-prefix", "--", script])
	t.deepEqual(order, [
		"start:a",
		"end:a",
		"start:b",
		"end:b",
		"start:c",
		"end:c",
	])
})

test.serial("--parallel", async t => {
	let order = []
	await runCli(order, ["--parallel", "--no-prefix", "--", script])
	t.deepEqual(order, [
		"start:a",
		"start:b",
		"start:c",
		"end:a",
		"end:b",
		"end:c",
	])
})

test.serial("--order-by-deps", async t => {
	let order = []
	await runCli(order, ["--order-by-deps", "--no-prefix", "--", script])
	t.deepEqual(order, [
		"start:c",
		"end:c",
		"start:a",
		"end:a",
		"start:b",
		"end:b",
	])
})

test.serial("--parallel --order-by-deps", async t => {
	let order = []
	await runCli(order, [
		"--parallel",
		"--order-by-deps",
		"--no-prefix",
		"--",
		script,
	])
	t.deepEqual(order, [
		"start:c",
		"end:c",
		"start:a",
		"start:b",
		"end:a",
		"end:b",
	])
})

test.serial("--parallel --order-by-deps=dependencies", async t => {
	let order = []
	await runCli(order, [
		"--parallel",
		"--order-by-deps=dependencies",
		"--no-prefix",
		"--",
		script,
	])
	t.deepEqual(order, [
		"start:b",
		"start:c",
		"end:b",
		"end:c",
		"start:a",
		"end:a",
	])
})

test.serial("throws - defaults", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await runCli(order, ["--no-prefix", "--", script, "throw-on-b"])
	}, ChildProcessFailedError)

	t.deepEqual(order, ["start:a", "end:a", "start:b"])
})

test.serial("throws - --parallel", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await runCli(order, [
			"--parallel",
			"--no-prefix",
			"--",
			script,
			"throw-on-b",
		])
	}, ChildProcessFailedError)

	t.deepEqual(order, ["start:a", "start:b", "start:c", "end:a"])
})

test.serial("throws - --continue-on-error", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await runCli(order, [
			"--continue-on-error",
			"--no-prefix",
			"--",
			script,
			"throw-on-b",
		])
	}, AggregateError)

	t.deepEqual(order, ["start:a", "end:a", "start:b", "start:c", "end:c"])
})

test.serial("throws - --parallel --continue-on-error", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await runCli(order, [
			"--parallel",
			"--continue-on-error",
			"--no-prefix",
			"--",
			script,
			"throw-on-b",
		])
	}, AggregateError)

	t.deepEqual(order, ["start:a", "start:b", "start:c", "end:a", "end:c"])
})

test.serial("multiple throws - --continue-on-error", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await runCli(order, [
			"--parallel",
			"--continue-on-error",
			"--no-prefix",
			"--",
			script,
			"throw-on-all",
		])
	}, AggregateError)

	t.deepEqual(order, ["start:a", "start:b", "start:c"])
})

test.serial.only("prefix", async t => {
	let order = []

	await runCli(order, ["--", script])

	t.is(order.length, 6)
	t.regex(order[0], /a │.*start:a/)
	t.regex(order[1], /a │.*end:a/)
	t.regex(order[2], /b │.*start:b/)
	t.regex(order[3], /b │.*end:b/)
	t.regex(order[4], /c │.*start:c/)
	t.regex(order[5], /c │.*end:c/)
})
