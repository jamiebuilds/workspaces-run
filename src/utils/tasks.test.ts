import test from "ava"
import { createTaskLimit } from "./tasks"
import { Limit } from "p-limit"

function sleep(ms: number) {
	return new Promise(res => setTimeout(res, ms))
}

async function testLimit(limit: Limit, items: string[]) {
	let order = []
	await Promise.all(
		items.map(item => {
			return limit(async () => {
				order.push(`start:${item}`)
				await sleep(1)
				order.push(`end:${item}`)
			})
		}),
	)
	return order
}

test("createTaskLimit(false)", async t => {
	let limit = createTaskLimit(false)
	let order = await testLimit(limit, ["a", "b", "c"])
	t.deepEqual(order, [
		"start:a",
		"end:a",
		"start:b",
		"end:b",
		"start:c",
		"end:c",
	])
})

test("createTaskLimit(undefined)", async t => {
	let limit = createTaskLimit(undefined)
	let order = await testLimit(limit, ["a", "b", "c"])
	t.deepEqual(order, [
		"start:a",
		"end:a",
		"start:b",
		"end:b",
		"start:c",
		"end:c",
	])
})

test("createTaskLimit(number)", async t => {
	let limit = createTaskLimit(2)
	let order = await testLimit(limit, ["a", "b", "c"])
	t.deepEqual(order, [
		"start:a",
		"start:b",
		"end:a",
		"start:c",
		"end:b",
		"end:c",
	])
})

// TODO: Differs from machine to machine so can't test without mocking
test.skip("createTaskLimit(physical-cores)", async t => {
	let limit = createTaskLimit("physical-cores")
	let order = await testLimit(limit, ["a", "b", "c"])
	t.deepEqual(order, [
		"start:a",
		"end:a",
		"start:b",
		"end:b",
		"start:c",
		"end:c",
	])
})
