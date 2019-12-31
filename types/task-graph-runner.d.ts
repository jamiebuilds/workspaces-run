declare module "task-graph-runner" {
	export interface Options<I, T> {
		graph: Map<I, I[]>
		task: (item: I) => Promise<T>
		force?: boolean
	}

	export interface Result<I, T> {
		safe: boolean
		values: Map<I, T>
	}

	export default function taskGraphRunner<I, T>(
		opts: Options<I, T>,
	): Promise<Result<I, T>>
}
