declare module "wrapline" {
	import stream from "stream"

	export default function wrapline(
		prefix?: string | ((pre: string, data: string) => string),
		suffix?: string | ((post: string, data: string) => string),
	): stream.Transform
}
