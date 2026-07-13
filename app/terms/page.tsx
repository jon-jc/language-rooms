import Link from "next/link";
import { Card } from "@/components/ui";

export const metadata = { title: "Terms of Service — LanguageRooms" };

export default function TermsPage() {
  return (
    <div className="mx-auto mt-8 max-w-3xl space-y-6">
      <Card>
        <h1 className="mb-4 text-2xl font-bold">Terms of Service</h1>
        <div className="space-y-4 text-sm leading-6 text-zinc-300">
          <section>
            <h2 className="mb-1 text-base font-semibold text-white">
              1. Age requirement — 18+ only
            </h2>
            <p>
              LanguageRooms is a live video and voice platform{" "}
              <strong className="text-white">
                strictly for adults aged 18 years or older
              </strong>
              . This minimum is absolute: there is no supervised, parental-consent,
              or regional exception, and no configuration of the service lowers it.
              Your age is verified from your date of birth at registration and the
              verification result is stored. Providing a false date of birth is a
              material breach of these terms and grounds for permanent removal.
            </p>
          </section>
          <section>
            <h2 className="mb-1 text-base font-semibold text-white">
              2. Video conduct rules
            </h2>
            <p>
              Before joining any room you must explicitly accept the video conduct
              rules. On camera and in voice you must not: expose or display sexual
              content or nudity; harass, threaten, or demean other participants;
              display weapons, violence, or self-harm; broadcast illegal content of
              any kind; or record other participants without their consent.
            </p>
          </section>
          <section>
            <h2 className="mb-1 text-base font-semibold text-white">
              3. Moderation, reports, and enforcement
            </h2>
            <p>
              Rooms have hosts and moderators who can mute, remove, or lock rooms.
              Any participant can report another;{" "}
              <strong className="text-white">
                submitting a report captures recent frames of the reported
                participant&apos;s video stream
              </strong>{" "}
              together with metadata (who reported whom, room, time) for review by
              our moderation team. Active streams may also be sampled by automated
              systems that detect prohibited content. Enforcement ranges from
              warnings to temporary or permanent bans. Content that we are legally
              required to report — including any child sexual abuse material — is
              preserved and escalated to the appropriate authorities.
            </p>
          </section>
          <section>
            <h2 className="mb-1 text-base font-semibold text-white">4. Your data</h2>
            <p>
              We store your account details, age-verification result, language
              profile, room activity needed to operate the service, and moderation
              records. We do not continuously record rooms; media flows through our
              servers only for real-time forwarding, plus the sampled frames and
              report evidence described above.
            </p>
          </section>
        </div>
        <p className="mt-6 text-sm text-zinc-500">
          <Link href="/signup" className="text-indigo-400 underline">
            Back to signup
          </Link>
        </p>
      </Card>
    </div>
  );
}
