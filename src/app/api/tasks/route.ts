import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/server/db";
import User from "@/server/models/User";
import Assignment from "@/server/models/Assignment";
import Task from "@/server/models/Task";
import AdminMicroTask from "@/server/models/AdminMicroTask";
import ActivityLog from "@/server/models/ActivityLog";
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
    const type = query.get("type") || "assigned_to_me";
    const q = query.get("q");
    const date = query.get("date");
    const department = query.get("department");
    const projectId = query.get("projectId");
    const assignedToId = query.get("assignedTo");
    
    const filter: any = {};
    if (projectId) filter.projectId = new Types.ObjectId(projectId);
    if (assignedToId) filter.assignedTo = new Types.ObjectId(assignedToId);

    if (type === "assigned_to_me") {
      filter.assignedTo = new Types.ObjectId(auth.userId);
    } else if (type === "assigned_by_me") {
      filter.assignedBy = new Types.ObjectId(auth.userId);
    } else if (type === "all" && (auth.role === "master_admin" || auth.role === "admin")) {
      if (auth.role !== "master_admin") {
        filter.$or = [
          { assignedTo: new Types.ObjectId(auth.userId) },
          { assignedBy: new Types.ObjectId(auth.userId) }
        ];
      }
    }

    const baseFilter: any = { ...filter };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      baseFilter.createdAt = { $gte: start, $lte: end };
    }

    const pipeline: any[] = [
      { $match: baseFilter },
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedToInfo"
        }
      },
      { $unwind: { path: "$assignedToInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "assignedBy",
          foreignField: "_id",
          as: "assignedByInfo"
        }
      },
      { $unwind: { path: "$assignedByInfo", preserveNullAndEmptyArrays: true } }
    ];

    if (q) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: q, $options: "i" } },
            { "assignedToInfo.name": { $regex: q, $options: "i" } },
            { "assignedByInfo.name": { $regex: q, $options: "i" } }
          ]
        }
      });
    }

    if (department) {
      pipeline.push({
        $match: { "assignedToInfo.team": { $regex: department, $options: "i" } }
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: "tasks",
          localField: "_id",
          foreignField: "assignmentId",
          as: "tasks"
        }
      },
      {
        $addFields: {
          totalTasks: { $size: "$tasks" },
          completedTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.status", "completed"] }
              }
            }
          },
          pendingTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $ne: ["$$task.status", "completed"] }
              }
            }
          }
        }
      },
      {
        $addFields: {
          progress: {
            $cond: [
              { $gt: ["$totalTasks", 0] },
              { $multiply: [{ $divide: ["$completedTasks", "$totalTasks"] }, 100] },
              0
            ]
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedBy",
          foreignField: "_id",
          as: "assignedBy"
        }
      },
      { $unwind: "$assignedBy" },
      {
        $addFields: {
          assignedTo: "$assignedToInfo"
        }
      },
      {
        $project: {
          "assignedBy.password": 0,
          "assignedTo.password": 0,
          assignedToInfo: 0
        }
      },
      { $sort: { createdAt: -1 } }
    );

    const assignments = await Assignment.aggregate(pipeline);
    return ok("Assignments retrieved successfully", assignments);
  } catch (error: any) {
    console.error("GET /tasks error:", error);
    return fail(500, "Internal Server Error");
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = getAuth(request);
    if (!auth) return fail(401, "Unauthorized");

    if (auth.role !== "master_admin" && auth.role !== "admin") {
      return fail(403, "Forbidden");
    }

    const body = await request.json();
    const { assignedTo, title, tasks: tasksData, projectId } = body;
    
    if (!assignedTo || !title || !tasksData || !Array.isArray(tasksData) || tasksData.length === 0) {
      return fail(400, "Missing required fields");
    }

    const targetUser = await User.findById(assignedTo).lean();
    if (!targetUser) return fail(400, "Assignee not found");
    
    if (auth.role === "admin" && targetUser.role !== "employee") {
      return fail(403, "Admins can only assign tasks to Employees.");
    }

    if (targetUser.isActive === false) {
      return fail(403, "Cannot assign tasks to an inactive user.");
    }

    const assignment = new Assignment({
      assignedBy: new Types.ObjectId(auth.userId),
      assignedTo: new Types.ObjectId(assignedTo),
      projectId: projectId ? new Types.ObjectId(projectId) : undefined,
      title: title.trim(),
      status: "pending",
    });
    await assignment.save();

    const parseDate = (d: string) => {
      if (!d) return null;
      if (d.includes("-") && d.split("-")[0].length === 4) return new Date(d);
      const p = d.split("/");
      if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      return new Date(d);
    };

    const createdTasks = [];
    for (const tData of tasksData) {
      if (!tData.title?.trim() || !tData.deadline) continue;
      const deadline = parseDate(tData.deadline);
      if (!deadline || isNaN(deadline.getTime())) continue;

      const task = new Task({
        assignmentId: assignment._id,
        title: tData.title.trim(),
        description: (tData.description || "No description").trim(),
        priority: (tData.priority || "medium").toLowerCase(),
        deadline,
        status: "pending",
        timeSpent: 0,
      });
      await task.save();
      createdTasks.push(task.toObject());
    }

    if (createdTasks.length === 0) {
      await Assignment.deleteOne({ _id: assignment._id });
      return fail(400, "No valid tasks.");
    }

    // Log activity
    try {
      await ActivityLog.create({
        userId: auth.userId,
        action: "create_assignment",
        resourceType: "user",
        resourceId: assignment._id.toString(),
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userAgent: request.headers.get("user-agent") || "unknown",
        timestamp: new Date(),
      });
    } catch (e) {}

    return ok("Assignment created successfully", { 
      assignment: assignment.toObject(), 
      tasks: createdTasks 
    }, 201);
  } catch (error: any) {
    console.error("POST /tasks error:", error);
    return fail(500, "Internal Server Error");
  }
}
