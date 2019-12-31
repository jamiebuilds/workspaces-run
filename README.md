# `workspaces-run`

> Run tasks/scripts across Yarn/Lerna/Bolt/etc workspaces.

## Install

```sh
npm install workspaces-run
```

## CLI

Run a command across every workspace:

```sh
$ workspaces-run -- echo "hello world"
@project/workspace-one   | hello-world
@project/workspace-two   | hello-world
@project/workspace-three | hello-world
```

### `--parallel`

```sh
$ workspaces-run --parallel -- script.sh
@project/workspace-one   | working...
@project/workspace-two   | working...
@project/workspace-three | working...
@project/workspace-one   | done.
@project/workspace-two   | done.
@project/workspace-three | done.
```

#### `--parallel=physical-cores`

```sh
# On a machine with 2 physical cores
$ workspaces-run --parallel=physical-cores -- script.sh
@project/workspace-one   | working...
@project/workspace-two   | working...
@project/workspace-one   | done.
@project/workspace-three | working...
@project/workspace-two   | done.
@project/workspace-three | done.
```

#### `--parallel=<number>`

```sh
$ workspaces-run --parallel=2 -- script.sh
@project/workspace-one   | working...
@project/workspace-two   | working...
@project/workspace-one   | done.
@project/workspace-three | working...
@project/workspace-two   | done.
@project/workspace-three | done.
```

### `--order-by-deps`

```sh
# When "one" and "two" depend on "three"
$ workspaces-run --order-by-deps -- script.sh
@project/workspace-three | working...
@project/workspace-three | done.
@project/workspace-one   | working...
@project/workspace-one   | done.
@project/workspace-two   | working...
@project/workspace-two   | done.
```

#### `--order-by-deps=<dependencyType>`

```sh
# When "three" is in "devDependencies" of "one" but in "peerDependencies" of "two"
$ workspaces-run --order-by-deps=devDependencies -- script.sh
@project/workspace-two   | working...
@project/workspace-two   | done.
@project/workspace-three | working...
@project/workspace-three | done.
@project/workspace-one   | working...
@project/workspace-one   | done.
```

### `--continue-on-error`

```sh
$ workspaces-run --continue-on-error -- script.sh
@project/workspace-one   | working...
@project/workspace-one   | Error!
@project/workspace-two   | working...
@project/workspace-two   | Error!
@project/workspace-three | working...
@project/workspace-three | done.
```

### `--no-prefix`

```sh
$ workspaces-run --no-prefix -- script.sh
working...
done.
working...
done.
working...
done.
```

### CLI Filtering

The task will be run on a workspace if **_all_** of the conditions are true.

- When **_any_** of the `--only` patterns match the workspace `package.json#name`; _and_
- When **_any_** of the `--only-fs` patterns match the workspace directory; _and_
- When **_all_** of the `--ignore` patterns do _not_ match the workspace `package.json#name`; _and_
- When **_all_** of the `--ignore-fs` patterns do _not_ match the workspace directory.

Patterns support any syntax available in [micromatch](https://github.com/micromatch/micromatch#matching-features):

```sh
workspaces-run --only-fs="**/path/to/dir/**"
workspaces-run --only="workspace-{one,two}"
```

Flags can be specified multiple times:

```sh
workspaces-run --only=<pattern> --only=<patern>
```

The flags `--only-fs` and `--ignore-fs` match against a relative path to the
current working directory.

## Library

```js
import workspacesRun from "workspaces-run"

await workspacesRun({ cwd }, async (workspace, allWorkspaces) => {
  await doSomething(workspace)
})
```

### `opts.cwd` (Required)

```js
let cwd = process.cwd()

await workspacesRun({ cwd }, ...)
```

### `opts.parallel`

```js
await workspacesRun({ cwd, parallel: true }, ...)
await workspacesRun({ cwd, parallel: "physical-cores" }, ...)
await workspacesRun({ cwd, parallel: 3 }, ...)
```

### `opts.orderByDeps`

```js
await workspacesRun({ cwd, orderByDeps: true }, ...)
await workspacesRun({ cwd, orderByDeps: ["devDependencies"] }, ...)
```

### `opts.continueOnError`

```js
await workspacesRun({ cwd, continueOnError: true }, ...)
```

### Library Filtering

The task will be run on a workspace if **_all_** of the conditions are true.

- When **_any_** of the `only` patterns match the workspace `package.json#name`; _and_
- When **_any_** of the `onlyFs` patterns match the workspace directory; _and_
- When **_all_** of the `ignore` patterns do _not_ match the workspace `package.json#name`; _and_
- When **_all_** of the `ignoreFs` patterns do _not_ match the workspace directory.

Patterns support any syntax available in [micromatch](https://github.com/micromatch/micromatch#matching-features):

```js
await workspacesRun({
  cwd,
  only: ["workspace-{one,two}"],
  onlyFs: ["**/path/to/dir/**"],
}, ...)
```

The options `onlyFs` and `ignoreFs` match against a relative path to the `cwd`.
