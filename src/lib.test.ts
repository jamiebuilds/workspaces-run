import test from "ava"
import path from "path"
import AggregateError from "aggregate-error"
import workspacesRun from "./lib"

let cwd = path.join(__dirname, "..", "fixture")

function sleep(ms: number) {
	return new Promise(res => setTimeout(res, ms))
}

test("defaults", async t => {
	let order = []
	await workspacesRun({ cwd }, async workspace => {
		order.push(`start:${workspace.name}`)
		await sleep(1)
		order.push(`end:${workspace.name}`)
	})
	t.deepEqual(order, [
		"start:a",
		"end:a",
		"start:b",
		"end:b",
		"start:c",
		"end:c",
	])
})

test("parallel: true", async t => {
	let order = []
	await workspacesRun({ cwd, parallel: true }, async workspace => {
		order.push(`start:${workspace.name}`)
		await sleep(1)
		order.push(`end:${workspace.name}`)
	})
	t.deepEqual(order, [
		"start:a",
		"start:b",
		"start:c",
		"end:a",
		"end:b",
		"end:c",
	])
})

test("orderByDeps: true", async t => {
	let order = []
	await workspacesRun({ cwd, orderByDeps: true }, async workspace => {
		order.push(`start:${workspace.name}`)
		await sleep(1)
		order.push(`end:${workspace.name}`)
	})
	t.deepEqual(order, [
		"start:c",
		"end:c",
		"start:a",
		"end:a",
		"start:b",
		"end:b",
	])
})

test("parallel: true, orderByDeps: true", async t => {
	let order = []
	await workspacesRun(
		{ cwd, parallel: true, orderByDeps: true },
		async workspace => {
			order.push(`start:${workspace.name}`)
			await sleep(1)
			order.push(`end:${workspace.name}`)
		},
	)
	t.deepEqual(order, [
		"start:c",
		"end:c",
		"start:a",
		"start:b",
		"end:a",
		"end:b",
	])
})

test("parallel: true, orderByDeps: [dependencies]", async t => {
	let order = []
	await workspacesRun(
		{ cwd, parallel: true, orderByDeps: ["dependencies"] },
		async workspace => {
			order.push(`start:${workspace.name}`)
			await sleep(1)
			order.push(`end:${workspace.name}`)
		},
	)
	t.deepEqual(order, [
		"start:b",
		"start:c",
		"end:b",
		"end:c",
		"start:a",
		"end:a",
	])
})

test("parallel: 2", async t => {
	let order = []
	await workspacesRun({ cwd, parallel: 2 }, async workspace => {
		order.push(`start:${workspace.name}`)
		await sleep(1)
		order.push(`end:${workspace.name}`)
	})
	t.deepEqual(order, [
		"start:a",
		"start:b",
		"end:a",
		"start:c",
		"end:b",
		"end:c",
	])
})

test("throws - defaults", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await workspacesRun({ cwd }, async workspace => {
			order.push(`start:${workspace.name}`)
			await sleep(1)
			if (workspace.name === "b") {
				throw new Error("oh no!")
			}
			order.push(`end:${workspace.name}`)
		})
	}, /oh no!/)

	t.deepEqual(order, ["start:a", "end:a", "start:b"])
})

test("throws - parallel: true", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await workspacesRun({ cwd, parallel: true }, async workspace => {
			order.push(`start:${workspace.name}`)
			await sleep(1)
			if (workspace.name === "b") {
				throw new Error("oh no!")
			}
			order.push(`end:${workspace.name}`)
		})
	}, /oh no!/)

	t.deepEqual(order, ["start:a", "start:b", "start:c", "end:a"])
})

test("throws - continueOnError: true", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await workspacesRun({ cwd, continueOnError: true }, async workspace => {
			order.push(`start:${workspace.name}`)
			await sleep(1)
			if (workspace.name === "b") {
				throw new Error("oh no!")
			}
			order.push(`end:${workspace.name}`)
		})
	}, /oh no!/)

	t.deepEqual(order, ["start:a", "end:a", "start:b", "start:c", "end:c"])
})

test("throws - parallel: true, continueOnError: true", async t => {
	let order = []

	await t.throwsAsync(async () => {
		await workspacesRun(
			{ cwd, parallel: true, continueOnError: true },
			async workspace => {
				order.push(`start:${workspace.name}`)
				await sleep(1)
				if (workspace.name === "b") {
					throw new Error("oh no!")
				}
				order.push(`end:${workspace.name}`)
			},
		)
	}, /oh no!/)

	t.deepEqual(order, ["start:a", "start:b", "start:c", "end:a", "end:c"])
})

test("multiple throws - continueOnError", async t => {
	let error = await t.throwsAsync(async () => {
		await workspacesRun({ cwd, continueOnError: true }, async workspace => {
			throw new Error(`error in ${workspace.name}`)
		})
	})

	t.true(error instanceof AggregateError)
	let errors = Array.from(error as AggregateError)
	t.regex(errors[0].message, /error in a/)
	t.regex(errors[1].message, /error in b/)
	t.regex(errors[2].message, /error in c/)
})
