import type { ReactNode } from "react";

import Link from "next/link";

export function AppShell({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5fbf5_0%,#eef5ef_45%,#f7f8f4_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="rounded-[2rem] border border-white/70 bg-white/90 px-6 py-5 shadow-[0_20px_60px_rgba(92,122,96,0.12)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700/80">
                Personal TFSA Tracker
              </p>
              <div>
                <h1 className="font-serif text-3xl tracking-tight text-slate-950">
                  Calm, local-first TFSA tracking
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Monitor estimated contribution room, keep your accounts organized,
                  and track manual TFSA activity in one place.
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/accounts">Accounts</NavLink>
              <NavLink href="/transactions">Transactions</NavLink>
              <NavLink href="/settings">Settings</NavLink>
            </nav>
          </div>
        </header>
        <main className="flex-1 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100"
    >
      {children}
    </Link>
  );
}

export function PageIntro({
  title,
  description,
  aside,
}: {
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <h2 className="font-serif text-3xl tracking-tight text-slate-950">{title}</h2>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {aside ? <div>{aside}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(92,122,96,0.10)] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h3 className="font-serif text-2xl tracking-tight text-slate-950">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-emerald-200 bg-emerald-50/60 px-5 py-8 text-sm text-slate-600">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-2 max-w-2xl leading-6">{description}</p>
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  min,
  step,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  min?: string | number;
  step?: string | number;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="block font-medium">{label}</span>
      <input
        className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
        defaultValue={defaultValue}
        min={min}
        name={name}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
      />
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  rows = 4,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="block font-medium">{label}</span>
      <textarea
        className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
        defaultValue={defaultValue ?? ""}
        name={name}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  required,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="space-y-2 text-sm text-slate-700">
      <span className="block font-medium">{label}</span>
      <select
        className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400"
        defaultValue={defaultValue}
        name={name}
        required={required}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PrimaryButton({
  children,
  type = "submit",
}: {
  children: ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button
      className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
      type={type}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <button
      className="rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
      type="submit"
    >
      {children}
    </button>
  );
}

export function DangerButton({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <button
      className="rounded-full border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-100"
      type="submit"
    >
      {children}
    </button>
  );
}
