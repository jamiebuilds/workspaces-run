#!/usr/bin/env node
let cli = require("./dist/cli")

cli
	.run(process.cwd(), process.argv.slice(2), [
		process.stdin,
		process.stdout,
		process.stderr,
	])
	.then(() => {
		process.exit(0)
	})
	.catch(err => {
		cli.reportError(err)
		process.exit(1)
	})
