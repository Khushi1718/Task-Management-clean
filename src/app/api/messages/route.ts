import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import Message from "@/server/models/Message";
import Notification from "@/server/models/Notification";
import { verifyToken } from "@/server/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7));
}

function fail(status: number, message: string) {
  return NextResponse.json({ success: false, message }, { status });
}

function ok(message: string, data?: any, status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const query = request.nextUrl.searchParams;
    const contextType = query.get("contextType");
    const contextId = query.get("contextId");
    const receiverId = query.get("receiverId");

    const filter: any = {
      deletedBy: { $ne: auth.userId }
    };
    if (contextType) filter.contextType = contextType;
    if (contextId) filter.contextId = contextId;
    
    if (contextType === "direct") {
      filter.$or = [
        { senderId: auth.userId, receiverIds: receiverId },
        { senderId: receiverId, receiverIds: auth.userId }
      ];
    }

    const messages = await Message.find(filter)
      .populate("senderId", "name email role")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    return ok("Messages retrieved", messages);
  } catch (error: any) {
    console.error("GET /messages error:", error);
    return fail(500, "Internal Server Error");
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    const body = await request.json();
    const { message, receiverIds, mentions, contextType, contextId, attachments } = body;
    
    if (!message && (!attachments || attachments.length === 0)) {
      return fail(400, "Message or attachments are required");
    }
    if (!contextType) return fail(400, "contextType is required");

    const newMessage = await Message.create({
      senderId: auth.userId,
      receiverIds: receiverIds || [],
      message: message || "",
      mentions: mentions || [],
      contextType,
      contextId,
      attachments: attachments || [],
    });

    // Create notifications for mentions
    if (mentions && mentions.length > 0) {
      const notifications = mentions
        .filter((mId: string) => mId !== auth.userId)
        .map((mId: string) => ({
          userId: mId,
          type: "mention",
          messageId: newMessage._id,
        }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    // Create notifications for direct messages
    if (contextType === "direct" && receiverIds && receiverIds.length > 0) {
      const directRecipients = receiverIds.filter(
        (rId: string) => rId !== auth.userId && (!mentions || !mentions.includes(rId))
      );
      if (directRecipients.length > 0) {
        await Notification.insertMany(
          directRecipients.map((rId: string) => ({
            userId: rId,
            type: "message",
            messageId: newMessage._id,
          }))
        );
      }
    }

    return ok("Message sent", newMessage, 201);
  } catch (error: any) {
    console.error("POST /messages error:", error);
    return fail(500, "Internal Server Error");
  }
}
