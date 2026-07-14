import { requireStaffPage } from "@/lib/auth/guards";
import AdminQueue from "@/components/admin/AdminQueue";

export const metadata = { title: "Moderation — LanguageRooms" };

export default async function AdminPage() {
  const staff = await requireStaffPage();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Moderation queue</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Escalated reports first. Every action here is audit-logged
          {staff.role === "MODERATOR"
            ? " — permanent bans and takedowns require an admin."
            : "."}
        </p>
      </div>
      <AdminQueue isAdmin={staff.role === "ADMIN"} />
    </div>
  );
}
