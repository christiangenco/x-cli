import { twitterApi } from "../config.js";
import { outputOk, outputError, isPretty } from "../output.js";

interface SendDmOptions {
  text: string;
  user?: string;
  userId?: string;
  conversationId?: string;
}

interface ListDmOptions {
  count?: string;
  conversationId?: string;
}

/**
 * Look up a user ID by @username
 */
async function resolveUserId(usernameOrId: string): Promise<string> {
  // If it looks like a numeric ID already, return it
  if (/^\d+$/.test(usernameOrId)) return usernameOrId;

  // Strip leading @
  const username = usernameOrId.replace(/^@/, "");
  const result = await twitterApi("GET", `users/by/username/${username}`);
  if (!result.data) {
    throw new Error(`User @${username} not found`);
  }
  return result.data.id;
}

/**
 * Send a DM to a user (creates a 1-on-1 conversation if needed)
 */
export async function sendDm(opts: SendDmOptions): Promise<void> {
  try {
    if (!opts.text) {
      outputError("--text is required");
      return;
    }

    let result: any;

    if (opts.conversationId) {
      // Send to an existing conversation
      result = await twitterApi("POST", `dm_conversations/${opts.conversationId}/messages`, {
        text: opts.text,
      });
    } else if (opts.user || opts.userId) {
      // Send to a user — use the "create conversation with participant" endpoint
      const participantId = opts.userId || (await resolveUserId(opts.user!));
      result = await twitterApi("POST", "dm_conversations/with/" + participantId + "/messages", {
        text: opts.text,
      });
    } else {
      outputError("Must provide --user, --user-id, or --conversation-id");
      return;
    }

    if (!result.data) {
      outputError("No data returned from API");
      return;
    }

    const dm = result.data;

    if (isPretty()) {
      console.log(`✅ DM sent`);
      console.log(`   Event ID: ${dm.dm_event_id}`);
      if (dm.dm_conversation_id) {
        console.log(`   Conversation: ${dm.dm_conversation_id}`);
      }
    } else {
      outputOk({
        dm_event_id: dm.dm_event_id,
        dm_conversation_id: dm.dm_conversation_id,
      });
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * List DM events (recent messages)
 */
export async function listDms(opts: ListDmOptions): Promise<void> {
  try {
    const count = parseInt(opts.count || "20");
    if (isNaN(count) || count < 1 || count > 100) {
      outputError("Count must be between 1 and 100");
      return;
    }

    let path: string;
    if (opts.conversationId) {
      // List messages in a specific conversation
      path = `dm_conversations/${opts.conversationId}/dm_events?max_results=${count}&dm_event.fields=id,text,created_at,sender_id,dm_conversation_id,event_type&expansions=sender_id&user.fields=username,name`;
    } else {
      // List all recent DM events
      path = `dm_events?max_results=${count}&dm_event.fields=id,text,created_at,sender_id,dm_conversation_id,event_type&expansions=sender_id&user.fields=username,name`;
    }

    const result = await twitterApi("GET", path);

    if (!result.data || !Array.isArray(result.data)) {
      if (isPretty()) {
        console.log("No DMs found.");
      } else {
        outputOk({ events: [], users: {} });
      }
      return;
    }

    // Build user lookup map from includes
    const userMap: Record<string, { username: string; name: string }> = {};
    if (result.includes?.users) {
      for (const u of result.includes.users) {
        userMap[u.id] = { username: u.username, name: u.name };
      }
    }

    const events = result.data;

    if (isPretty()) {
      console.log("Date                 Sender              Conversation            Text");
      console.log("─".repeat(90));

      for (const ev of events) {
        if (ev.event_type !== "MessageCreate") continue;
        const date = new Date(ev.created_at).toISOString().slice(0, 16).replace("T", " ");
        const sender = userMap[ev.sender_id]
          ? `@${userMap[ev.sender_id].username}`
          : ev.sender_id;
        const convId = ev.dm_conversation_id || "";
        const text = (ev.text || "").replace(/\n/g, " ");
        const truncText = text.length > 40 ? text.slice(0, 37) + "..." : text;

        console.log(
          `${date}  ${sender.padEnd(18)} ${convId.padEnd(22)} ${truncText}`
        );
      }
    } else {
      outputOk({ events, users: userMap });
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * List DM conversations
 */
export async function listConversations(opts: { count?: string }): Promise<void> {
  try {
    const count = parseInt(opts.count || "20");
    if (isNaN(count) || count < 1 || count > 100) {
      outputError("Count must be between 1 and 100");
      return;
    }

    // The X API doesn't have a dedicated "list conversations" endpoint,
    // so we fetch recent DM events and group by conversation_id
    const result = await twitterApi(
      "GET",
      `dm_events?max_results=${Math.min(count * 3, 100)}&dm_event.fields=id,text,created_at,sender_id,dm_conversation_id,event_type&expansions=sender_id&user.fields=username,name`
    );

    if (!result.data || !Array.isArray(result.data)) {
      if (isPretty()) {
        console.log("No DM conversations found.");
      } else {
        outputOk({ conversations: [] });
      }
      return;
    }

    // Build user lookup map
    const userMap: Record<string, { username: string; name: string }> = {};
    if (result.includes?.users) {
      for (const u of result.includes.users) {
        userMap[u.id] = { username: u.username, name: u.name };
      }
    }

    // Group by conversation
    const convos = new Map<string, { id: string; lastMessage: string; lastDate: string; participants: Set<string> }>();

    for (const ev of result.data) {
      if (ev.event_type !== "MessageCreate") continue;
      const convId = ev.dm_conversation_id;
      if (!convId) continue;

      if (!convos.has(convId)) {
        convos.set(convId, {
          id: convId,
          lastMessage: ev.text || "",
          lastDate: ev.created_at,
          participants: new Set(),
        });
      }

      const convo = convos.get(convId)!;
      if (ev.sender_id) convo.participants.add(ev.sender_id);
    }

    const conversations = Array.from(convos.values()).slice(0, count);

    if (isPretty()) {
      console.log("Conversation ID                        Participants          Last Message");
      console.log("─".repeat(90));

      for (const convo of conversations) {
        const parts = Array.from(convo.participants)
          .map((id) => (userMap[id] ? `@${userMap[id].username}` : id))
          .join(", ");
        const msg = convo.lastMessage.replace(/\n/g, " ");
        const truncMsg = msg.length > 30 ? msg.slice(0, 27) + "..." : msg;

        console.log(
          `${convo.id.padEnd(38)} ${parts.padEnd(20)} ${truncMsg}`
        );
      }
    } else {
      outputOk({
        conversations: conversations.map((c) => ({
          id: c.id,
          participants: Array.from(c.participants).map((id) => ({
            id,
            ...(userMap[id] || {}),
          })),
          last_message: c.lastMessage,
          last_date: c.lastDate,
        })),
      });
    }
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error));
  }
}
