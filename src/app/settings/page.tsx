import { saveSettings } from "@/app/actions";
import {
  Card,
  Field,
  PageIntro,
  PrimaryButton,
  SectionTitle,
  TextArea,
} from "@/components/ui";
import { getAppData } from "@/lib/tfsa/data";
import { formatCents } from "@/lib/format";

export default async function SettingsPage() {
  const { settings } = await getAppData();

  return (
    <div>
      <PageIntro
        title="Settings"
        description="Set the starting point for your estimated TFSA contribution room and keep a note about how you verified it."
      />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionTitle
            title="Estimated contribution room settings"
            description="These values anchor the calculator. The dashboard and yearly summaries use the shared utility, not component-level math."
          />

          <form action={saveSettings} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                defaultValue={settings.startingYear}
                label="Starting year"
                min={2009}
                name="startingYear"
                required
                step={1}
                type="number"
              />
              <Field
                defaultValue={(settings.startingContributionRoomCents / 100).toString()}
                label="Starting contribution room (CAD)"
                name="startingContributionRoom"
                required
                step="0.01"
                type="number"
              />
            </div>
            <TextArea
              defaultValue={settings.contributionRoomNotes}
              label="Verification notes"
              name="contributionRoomNotes"
              placeholder="Example: verified against CRA My Account estimate on Jan 1, 2026."
              rows={5}
            />
            <div>
              <PrimaryButton>Save settings</PrimaryButton>
            </div>
          </form>
        </Card>

        <Card>
          <SectionTitle
            title="Current estimate base"
            description="A quick view of the values that will feed the room estimator."
          />

          <dl className="grid gap-4 text-sm">
            <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4">
              <dt className="text-slate-500">Starting year</dt>
              <dd className="mt-1 font-serif text-3xl tracking-tight text-slate-950">
                {settings.startingYear}
              </dd>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4">
              <dt className="text-slate-500">Starting estimated contribution room</dt>
              <dd className="mt-1 font-serif text-3xl tracking-tight text-slate-950">
                {formatCents(settings.startingContributionRoomCents)}
              </dd>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 px-5 py-4">
              <dt className="text-slate-500">Verification notes</dt>
              <dd className="mt-2 whitespace-pre-wrap leading-6 text-slate-700">
                {settings.contributionRoomNotes || "No verification notes saved yet."}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
