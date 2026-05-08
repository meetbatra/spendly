import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <main className="flex w-full max-w-3xl flex-col justify-between gap-12 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-200 md:p-12">
        <Image
          className="h-auto w-auto"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="space-y-5">
          <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-2xl text-base leading-8 text-zinc-600">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              className="font-medium text-zinc-900 underline-offset-4 hover:underline"
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              className="font-medium text-zinc-900 underline-offset-4 hover:underline"
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="h-4 w-4 invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
