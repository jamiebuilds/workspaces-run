import test from "ava"
import path from "path"
import {
	arrify,
	getFilteredWorkspaces,
	getWorkspaceGraph,
	matchesDependency,
	matchesPatterns,
} from "./workspaces"

let cwd = path.join(__dirname, "..", "..", "fixture")

test("arrify(...)", t => {
	t.deepEqual(arrify(undefined), [])
	t.deepEqual(arrify([]), [])
	t.deepEqual(arrify([1]), [1])
	t.deepEqual(arrify([1, 2]), [1, 2])
	t.deepEqual(arrify(1), [1])
})

test("matchesPatterns(..., emptyShouldMatch: true)", t => {
	t.true(matchesPatterns("foo", [], true))
	t.true(matchesPatterns("foo", ["foo"], true))
	t.true(matchesPatterns("foo", ["bar", "foo"], true))
	t.true(matchesPatterns("foo", ["f*"], true))
	t.true(matchesPatterns("@foo/bar", ["@foo/*"], true))
	t.false(matchesPatterns("foo", ["bar"], true))
})

test("matchesPatterns(..., emptyShouldMatch: false)", t => {
	t.false(matchesPatterns("foo", [], false))
	t.true(matchesPatterns("foo", ["foo"], false))
	t.true(matchesPatterns("foo", ["bar", "foo"], false))
	t.true(matchesPatterns("foo", ["f*"], true))
	t.true(matchesPatterns("@foo/bar", ["@foo/*"], true))
	t.false(matchesPatterns("foo", ["bar"], false))
})

test("getFilteredWorkspaces({ ... })", async t => {
	let workspaces = await getFilteredWorkspaces({ cwd })
	t.is(workspaces.length, 3)
	t.is(workspaces[0].name, "a")
	t.is(workspaces[1].name, "b")
	t.is(workspaces[2].name, "c")
})

test("getFilteredWorkspaces({ only })", async t => {
	let workspaces = await getFilteredWorkspaces({ cwd, only: "a" })
	t.is(workspaces.length, 1)
	t.is(workspaces[0].name, "a")
})

test("getFilteredWorkspaces({ onlyFs })", async t => {
	let workspaces = await getFilteredWorkspaces({ cwd, onlyFs: "./packages/b" })
	t.is(workspaces.length, 1)
	t.is(workspaces[0].name, "b")
})

test("getFilteredWorkspaces({ ignore })", async t => {
	let workspaces = await getFilteredWorkspaces({ cwd, ignore: "a" })
	t.is(workspaces.length, 2)
	t.is(workspaces[0].name, "b")
	t.is(workspaces[1].name, "c")
})

test("getFilteredWorkspaces({ ignoreFs })", async t => {
	let workspaces = await getFilteredWorkspaces({
		cwd,
		ignoreFs: "./packages/b",
	})
	t.is(workspaces.length, 2)
	t.is(workspaces[0].name, "a")
	t.is(workspaces[1].name, "c")
})

test("getFilteredWorkspaces({ only, ignore })", async t => {
	let workspaces = await getFilteredWorkspaces({
		cwd,
		only: ["a", "b"],
		ignore: "b",
	})
	t.is(workspaces.length, 1)
	t.is(workspaces[0].name, "a")
})

test("matchesDependency(...) -- version dep", async t => {
	let workspaces = await getFilteredWorkspaces({ cwd })
	let a = workspaces.find(w => w.name === "a")!
	let c = workspaces.find(w => w.name === "c")!
	let depVersion = a!.config.dependencies!.c
	t.true(matchesDependency(a, c, depVersion, cwd))
})

test("matchesDependency(...) -- path dep", async t => {
	let workspaces = await getFilteredWorkspaces({ cwd })
	let b = workspaces.find(w => w.name === "b")!
	let c = workspaces.find(w => w.name === "c")!
	let depVersion = b!.config.devDependencies!.c
	t.true(matchesDependency(b, c, depVersion, cwd))
})

test("getWorkspaceGraph({ ... })", async t => {
	let workspaces = await getFilteredWorkspaces({ cwd })
	let graph = getWorkspaceGraph(workspaces, { cwd })

	let a = workspaces.find(w => w.name === "b")!
	let b = workspaces.find(w => w.name === "b")!
	let c = workspaces.find(w => w.name === "c")!

	t.is(graph.size, 3)
	t.is(graph.get(a)!.length, 1)
	t.is(graph.get(b)!.length, 1)
	t.is(graph.get(c)!.length, 0)
})

test("getWorkspaceGraph({ ignore })", async t => {
	let workspaces = await getFilteredWorkspaces({ cwd, ignore: "c" })
	let graph = getWorkspaceGraph(workspaces, { cwd })

	let a = workspaces.find(w => w.name === "b")!
	let b = workspaces.find(w => w.name === "b")!
	let c = workspaces.find(w => w.name === "c")!

	t.is(graph.size, 2)
	t.is(graph.get(a)!.length, 0)
	t.is(graph.get(b)!.length, 0)
})
