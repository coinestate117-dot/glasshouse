import { getGlobalActivity } from "@/lib/activity";
import ActivityFeed from "@/components/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const items = await getGlobalActivity();

  return (
    <div style={{ padding: "16px 16px 0" }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Activity
      </div>
      <ActivityFeed items={items} showWallet />
    </div>
  );
}
