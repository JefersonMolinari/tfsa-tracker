import { Card, EmptyState, PageIntro } from "@/components/ui";
import { formatCents } from "@/lib/format";
import { getAppData } from "@/lib/tfsa/data";
import { buildDashboardSummary } from "@/lib/tfsa/dashboard";

function WarningBanner({
  warningLevel,
}: {
  warningLevel: "safe" | "low" | "over";
}) {
  if (warningLevel === "safe") {
    return null;
  }

  const isOver = warningLevel === "over";

  return (
    <Card
      className={
        isOver
          ? "mb-6 border-red-200 bg-red-50/90"
          : "mb-6 border-amber-200 bg-amber-50/90"
      }
    >
      <p
        className={`text-sm font-medium ${
          isOver ? "text-red-900" : "text-amber-900"
        }`}
      >
        {isOver
          ? "Estimated TFSA contribution room is below $0. Review recent contributions to avoid an over-contribution."
          : "Estimated TFSA contribution room is below $500. A small contribution could put you at risk of over-contributing."}
      </p>
    </Card>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "safe" | "low" | "over";
}) {
  const toneClass =
    tone === "safe"
      ? "border-emerald-200 bg-emerald-50/80"
      : tone === "low"
        ? "border-amber-200 bg-amber-50/80"
        : tone === "over"
          ? "border-red-200 bg-red-50/80"
          : "border-white/70 bg-white/90";

  return (
    <Card className={toneClass}>
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-4 font-serif text-4xl tracking-tight text-slate-950">{value}</p>
    </Card>
  );
}

export default async function Home() {
  const { annualLimits, settings, transactions } = await getAppData();

  const summary = buildDashboardSummary({
    annualLimits,
    settings,
    transactions,
    asOf: new Date(),
  });

  const estimatedRoomTone =
    summary.warningLevel === "over"
      ? "over"
      : summary.warningLevel === "low"
        ? "low"
        : "safe";

  return (
    <div>
      <PageIntro
        title="Dashboard"
        description="A calm snapshot of your TFSA activity, with contribution room always shown as an estimate."
      />

      <WarningBanner warningLevel={summary.warningLevel} />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Estimated Contribution Room"
          tone={estimatedRoomTone}
          value={formatCents(summary.estimatedContributionRoomCents)}
        />
        <StatCard
          label="Contributions This Year"
          value={formatCents(summary.contributionsThisYearCents)}
        />
        <StatCard
          label="Withdrawals This Year"
          value={formatCents(summary.withdrawalsThisYearCents)}
        />
        <StatCard
          label="Total TFSA Balance"
          value={formatCents(summary.totalTfsaBalanceCents)}
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <h3 className="font-serif text-2xl tracking-tight text-slate-950">
            Estimated room notes
          </h3>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Estimated contribution room is based on your starting settings, seeded
              annual limits, and the transactions recorded in this app.
            </p>
            <p>
              Withdrawals restore room on January 1 of the following year. Transfers,
              fees, interest, dividends, and market changes do not change contribution
              room.
            </p>
          </div>
        </Card>

        <Card>
          <h3 className="font-serif text-2xl tracking-tight text-slate-950">
            Data health
          </h3>
          <dl className="mt-5 grid gap-4 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-600">Annual limits loaded</dt>
              <dd className="font-semibold text-slate-900">{annualLimits.length}</dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-600">Transactions recorded</dt>
              <dd className="font-semibold text-slate-900">{transactions.length}</dd>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <dt className="text-slate-600">Starting year</dt>
              <dd className="font-semibold text-slate-900">{settings.startingYear}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {transactions.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No TFSA transactions yet"
            description="Add accounts and transactions to see estimated contribution room, yearly activity, and total TFSA balance."
          />
        </div>
      ) : null}
    </div>
  );
}
