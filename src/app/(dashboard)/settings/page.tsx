import { redirect } from "next/navigation";
import { requireUser } from "@/lib/access";
import { can } from "@/lib/permissions";
import { getMailSettingsData } from "@/features/settings/actions";
import { MailSettingsHub } from "@/features/settings/components/mail-settings-hub";

export const metadata = {
  title: "Settings — Mail & Communication · Pragya Yog School",
};

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user.isSystemAdmin && user.role !== "MANAGER" && !can(user, "settings:manage")) {
    redirect("/dashboard");
  }
  const data = await getMailSettingsData();

  return <MailSettingsHub data={data} />;
}
