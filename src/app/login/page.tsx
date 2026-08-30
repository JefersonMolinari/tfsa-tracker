import { login } from "./actions";

type LoginSearchParams = Promise<{
  error?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: LoginSearchParams;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-7 shadow-[0_20px_60px_rgba(92,122,96,0.14)]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/80">
          Personal TFSA Tracker
        </p>
        <h1 className="font-serif text-3xl tracking-tight text-slate-950">
          Sign in
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Enter your private tracker password to continue.
        </p>
      </div>

      {error === "invalid" ? (
        <p
          aria-live="polite"
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          The password was not accepted.
        </p>
      ) : null}

      <form action={login} className="mt-6 space-y-5">
        <label className="space-y-2 text-sm text-slate-700">
          <span className="block font-medium">Password</span>
          <input
            autoComplete="current-password"
            autoFocus
            className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
            name="password"
            required
            type="password"
          />
        </label>
        <button
          className="w-full rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          type="submit"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
