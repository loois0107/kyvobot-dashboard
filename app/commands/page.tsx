"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CommandsContent() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild_id");

  const [userId, setUserId] = useState<string>("");
  const [commands, setCommands] = useState<Record<string, string>>({});
  const [trigger, setTrigger] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    if (!guildId) return;
    try {
      setLoading(true);
      const res = await fetch(`https://kyvobot.onrender.com/api/settings?guild_id=${guildId}`);
      const result = await res.json();
      if (result.status === "success") {
        setCommands(result.data.custom_commands || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [guildId]);

  const saveCommands = async (updatedCommands: Record<string, string>) => {
    if (!guildId || !userId) {
      setMessage({ type: "error", text: "🔒 Administrator User ID is strictly required for validation verification." });
      return;
    }
    try {
      setActionLoading(true);
      setMessage(null);

      const res = await fetch(`https://kyvobot.onrender.com/api/settings/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guild_id: guildId,
          user_id: userId,
          payload: { custom_commands: updatedCommands }
        })
      });

      const result = await res.json();
      if (result.status === "success") {
        setCommands(updatedCommands);
        setMessage({ type: "success", text: "Database cluster synchronization transaction successful." });
        setTrigger("");
        setResponse("");
      } else {
        setMessage({ type: "error", text: result.message || "Transaction authorization denied." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Network compilation failure." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdd = () => {
    if (!trigger.trim() || !response.trim()) {
      setMessage({ type: "error", text: "Trigger vector and response array data blocks cannot be empty." });
      return;
    }
    const updated = { ...commands, [trigger.trim()]: response.trim() };
    saveCommands(updated);
  };

  const handleDelete = (key: string) => {
    const updated = { ...commands };
    delete updated[key];
    saveCommands(updated);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-zinc-200">
      <div className="border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold text-white">Custom Trigger Core</h1>
        <p className="text-sm text-zinc-400 mt-1">Configure automated dynamic text keyword arrays for your active guild network.</p>
      </div>

      <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-xl space-y-3">
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Security Access Credentials</label>
        <input
          type="text"
          placeholder="Enter Admin Discord User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-zinc-500 font-mono"
        />
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm border ${
          message.type === "success" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/30 p-4 border border-zinc-800 rounded-xl items-end">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Keyword Trigger</label>
          <input
            type="text"
            placeholder="e.g., !ping"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Automated Response</label>
          <input
            type="text"
            placeholder="e.g., Pong!"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={actionLoading}
          className="w-full py-2 bg-white text-zinc-950 hover:bg-zinc-200 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {actionLoading ? "Syncing..." : "Deploy Script"}
        </button>
      </div>

      <div className="border border-zinc-800 rounded-xl bg-zinc-950/50 overflow-hidden">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 font-medium text-sm text-zinc-400">
          Active Custom Trigger Matrix
        </div>
        {loading ? (
          <div className="p-8 text-center text-zinc-600 text-sm">Compiling network data nodes...</div>
        ) : Object.keys(commands).length === 0 ? (
          <div className="p-8 text-center text-zinc-600 text-sm">No custom modules active within this grid perimeter.</div>
        ) : (
          <div className="divide-y divide-zinc-900">
            {Object.entries(commands).map(([key, val]) => (
              <div key={key} className="p-4 flex justify-between items-center hover:bg-zinc-900/20 transition-colors">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white font-mono bg-zinc-800 px-2 py-0.5 rounded w-max">{key}</div>
                  <div className="text-sm text-zinc-400">{val}</div>
                </div>
                <button
                  onClick={() => handleDelete(key)}
                  disabled={actionLoading}
                  className="px-3 py-1 text-xs font-semibold border border-red-500/30 bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  Terminate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomCommandsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-zinc-500 text-sm">Loading config shell...</div>}>
      <CommandsContent />
    </Suspense>
  );
}
