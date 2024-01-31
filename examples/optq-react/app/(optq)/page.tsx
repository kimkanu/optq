"use client";

import { useOptq, useOptqRequestStats } from "@optq/react";
import { useQueryState } from "nuqs";

import { type Api } from "@/lib/optq";
import RequestProgress from "./RequestProgress";

const USERS = ["1", "2", "3"];

export default function Page() {
  const [userId, setUserId] = useQueryState("userId");

  const optq = useOptq<Api>();
  const requestStats = useOptqRequestStats(optq);

  const version = optq.useQuery({
    resourceId: "/users/:userId/version",
    params: { userId: userId ?? "1" },
  });

  return (
    <>
      <RequestProgress stats={requestStats} />

      <div style={{ width: "100%", fontSize: 24, marginBottom: 32 }}>
        <select
          style={{
            width: "100%",
            fontSize: 20,
            padding: "10px 16px",
            borderRadius: 12,
            borderWidth: 0,
            borderColor: "transparent",
            backgroundColor: "#f4f4f5",
            textAlign: "center",
            color: "#383839",
          }}
          value={userId ?? "1"}
          onChange={(e) => {
            setUserId(e.target.value);
          }}
        >
          {USERS.map((user) => (
            <option key={user} value={user}>
              User {user}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        <span style={{ fontSize: 24 }}>Version: {version.data}</span>
        <button
          type="button"
          style={{
            appearance: "none",
            backgroundColor: "#e2e8f0",
            color: "#2563eb",
            fontSize: 20,
            border: "none",
            padding: "8px 16px",
            borderRadius: 12,
          }}
          onClick={async () => {
            await optq.mutate({
              apiId: "POST /users/:userId/version/increase",
              params: { userId: userId ?? "1" },
              headers: { "x-user-credential": "correct" },
              body: { increaseBy: 1 },
            });
          }}
        >
          Increase version
        </button>
      </div>
    </>
  );
}
