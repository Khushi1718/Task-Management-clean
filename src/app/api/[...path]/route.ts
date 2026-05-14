import { NextRequest, NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/server/db";
import User from "@/server/models/User";
import WorkLog from "@/server/models/WorkLog";
import ActivityLog from "@/server/models/ActivityLog";
import Message from "@/server/models/Message";
import Notification from "@/server/models/Notification";
import Task from "@/server/models/Task";
import Assignment from "@/server/models/Assignment";
import AdminMicroTask from "@/server/models/AdminMicroTask";
import Project from "@/server/models/Project";
import { generateToken, verifyToken, type JWTPayload } from "@/server/jwt";
import { uploadToCloudinary } from "@/server/cloudinary";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: {
    path?: string[];
  };
};

type Pagination = {
  total: number;
  limit: number;
  skip: number;
};

function ok<T>(message: string, data?: T, status = 200, pagination?: Pagination) {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      ...(pagination
        ? {
            pagination: {
              ...pagination,
              pages: Math.ceil(pagination.total / pagination.limit),
            },
          }
        : {}),
    },
    { status }
  );
}

function fail(status: number, message: string, error = message) {
  return NextResponse.json({ success: false, message, error }, { status });
}

function getPath(context: Context) {
  return `/${(context.params.path || []).join("/")}`;
}

async function readBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function getQuery(request: NextRequest) {
  return request.nextUrl.searchParams;
}

function getAuth(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return verifyToken(authHeader.slice(7));
}

function requireAuth(request: NextRequest) {
  try {
    const user = getAuth(request);
    if (!user) return { response: fail(401, "No token provided", "Authorization header missing") };
    return { user };
  } catch {
    return { response: fail(401, "Authentication failed", "Invalid or expired token") };
  }
}

function requireAdmin(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.response) return auth;
  if (auth.user.role !== "admin" && auth.user.role !== "master_admin") {
    return { response: fail(403, "Access denied", "Insufficient permissions") };
  }
  return auth;
}

function requireMasterAdmin(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth.response) return auth;
  if (auth.user.role !== "master_admin") {
    return { response: fail(403, "Access denied", "Insufficient permissions") };
  }
  return auth;
}

async function logActivity(
  request: NextRequest,
  data: {
    userId: string;
    action: string;
    resourceType: "worklog" | "user" | "system" | "task" | "assignment";
    resourceId?: string;
    details?: Record<string, unknown>;
  }
) {
  try {
    await ActivityLog.create({
      ...data,
      details: data.details || {},
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
}

function boundedNumber(value: string | null, fallback: number, max: number) {
  return Math.min(parseInt(value || "", 10) || fallback, max);
}

function normalizeSeoData(seoData: any) {
  return {
    questionsAnswered: Math.max(0, Number(seoData?.questionsAnswered) || 0),
    backlinksCreated: Math.max(0, Number(seoData?.backlinksCreated) || 0),
    proofs: Array.isArray(seoData?.proofs) ? seoData.proofs : [],
  };
}

export async function POST(request: NextRequest, context: any) {
  try {
    await connectDB();
    
    // Defensive path reading
    const pathParts = context?.params?.path || [];
    const path = "/" + pathParts.join("/");
    const method = request.method;
    
    // Defensive body reading
    let body: any = {};
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      try {
        body = await request.json();
      } catch (e) {
        console.warn("Could not parse JSON body, using empty object");
      }
    }


    // --- TASK MANAGEMENT (PRIORITY) ---

    if (path === "/projects") {
      const auth = requireAuth(request);
      if (auth.response) return auth.response;

      if (auth.user.role !== "master_admin") return fail(403, "Only Master Admins can create projects");
      const { name, description, clientName, members } = body;
      if (!name) return fail(400, "Name is required");

      const project = new Project({
        name,
        description: description || "No summary provided.",
        clientName,
        members: (members || []).map((m: string) => new Types.ObjectId(m)),
        createdBy: new Types.ObjectId(auth.user.userId),
      });
      if (project.members.length === 0) {
        project.members.push(new Types.ObjectId(auth.user.userId));
      }
      await project.save();
      return ok("Project created successfully", project, 201);
    }

  // POST /admin/micro-tasks — Admin submits a self-accountability micro-task to master admin
  if (path === "/admin/micro-tasks") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    // Only admins can submit micro-tasks this way
    if (auth.user.role !== "admin") {
      return fail(403, "Only Admins can submit micro-tasks via this route");
    }

    const { title, description, proofLinks, proofFiles, timeSpent, taskDate } = body;

    if (!title || !title.trim()) {
      return fail(400, "Task title is required");
    }

    try {
      const microTask = await AdminMicroTask.create({
        submittedBy: new Types.ObjectId(auth.user.userId),
        title: title.trim(),
        description: description?.trim() || "",
        proofLinks: Array.isArray(proofLinks) ? proofLinks.filter((l: string) => l.trim()) : [],
        proofFiles: Array.isArray(proofFiles) ? proofFiles : [],
        timeSpent: Number(timeSpent) || 0,
        taskDate: taskDate ? new Date(taskDate) : new Date(),
        status: "acknowledged",
        submittedAt: new Date(),
      });

      logActivity(request, {
        userId: auth.user.userId,
        action: "submit_micro_task",
        resourceType: "task",
        resourceId: microTask._id.toString(),
        details: { title: microTask.title },
      });

      return ok("Micro-task submitted to master admin successfully", microTask, 201);
    } catch (error: any) {
      console.error("MICRO_TASK_CREATE_ERROR:", error);
      return fail(500, "Failed to submit micro-task");
    }
  }

  return fail(404, "Route not found");
  } catch (error: any) {
    console.error(`POST ${getPath(context)} error:`, error);
    return fail(500, "Internal Server Error", error.message);
  }
}

export async function GET(request: NextRequest, context: Context) {
  try {
    await connectDB();
    const path = getPath(context);
    const query = getQuery(request);
    const method = request.method;


  if (path === "/projects") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const filter: any = {};
    if (auth.user.role !== "master_admin") {
      filter.members = new Types.ObjectId(auth.user.userId);
    }
    const projectsList = await Project.find(filter)
      .select("name description clientName status members createdBy createdAt")
      .populate("members", "name email role team")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return ok("Projects retrieved", projectsList);

  }

  const projectDetailMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectDetailMatch) {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;
    const projectId = projectDetailMatch[1];

    const project = await Project.findById(projectId)
      .select("name description clientName status members createdBy createdAt")
      .populate("members", "name email role team")
      .populate("createdBy", "name")
      .lean();


    if (!project) return fail(404, "Project not found");
    
    // Check permission
    if (auth.user.role !== "master_admin" && !project.members.some((m: any) => m._id.toString() === auth.user.userId)) {
      return fail(403, "Access denied to this project");
    }
    return ok("Project retrieved", project);
  }

  if (path === "/admin/users") {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const role = query.get("role");
    const team = query.get("team");
    const q = query.get("q");
    const isActive = query.get("isActive");
    const limitNum = Math.min(Math.max(parseInt(query.get("limit") || "20"), 1), 100);
    const skipNum = Math.max(parseInt(query.get("skip") || "0"), 0);

    const filter: any = {};
    if (isActive !== null) filter.isActive = isActive === "true";
    if (role && role !== "all") filter.role = role;
    if (team && team !== "all") {
      // Case-insensitive department filtering
      filter.team = { $regex: new RegExp(`^${team}$`, "i") };
    }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ joinedAt: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .lean();

    // Fetch real-time stats for each user (Total Logs and Combined Completed Tasks)
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const [logs, assignments, microTasksCount] = await Promise.all([
        WorkLog.find({ 
          userId: u._id, 
          state: { $in: ["submitted", "auto_submitted"] } 
        }).select("tasks").lean(),
        Assignment.find({ assignedTo: u._id }).select("_id").lean(),
        AdminMicroTask.countDocuments({ submittedBy: u._id })
      ]);
      
      // Count tasks from Assignments
      const assignmentIds = assignments.map(a => a._id);
      const assignmentTasksCount = await Task.countDocuments({ 
        assignmentId: { $in: assignmentIds },
        status: "completed"
      });

      // Count tasks from WorkLogs
      const workLogTasksCount = logs.reduce((sum, log) => {
        return sum + (log.tasks?.filter((t: any) => t.status === "completed").length || 0);
      }, 0);
      
      return { 
        ...u, 
        id: u._id, 
        totalLogs: logs.length, 
        totalTasks: assignmentTasksCount + workLogTasksCount + microTasksCount
      };
    }));

    const total = await User.countDocuments(filter);

    logActivity(request, {
      userId: auth.user.userId,
      action: "view_users",
      resourceType: "user",
    });

    return ok("Users retrieved successfully", usersWithStats, 200, {
      total,
      limit: limitNum,
      skip: skipNum,
    });
  }

  const adminUserMatch = path.match(/^\/admin\/users\/([^/]+)$/);
  if (adminUserMatch) {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const userId = adminUserMatch[1];
    if (!Types.ObjectId.isValid(userId)) {
      return fail(404, "User not found");
    }

    const user = await User.findById(userId).select("-password").lean();
    if (!user) return fail(404, "User not found");

    const [totalLogs, assignmentTasksCount, workLogTasksResult, adminMicroTasksCount] = await Promise.all([
      WorkLog.countDocuments({ 
        userId: new Types.ObjectId(userId),
        state: { $in: ["submitted", "auto_submitted"] }
      }),
      (async () => {
        const assignments = await Assignment.find({ assignedTo: new Types.ObjectId(userId) }).select("_id").lean();
        const assignmentIds = assignments.map(a => a._id);
        return Task.countDocuments({ 
          assignmentId: { $in: assignmentIds },
          status: "completed"
        });
      })(),
      WorkLog.aggregate([
        { $match: { userId: new Types.ObjectId(userId), state: { $in: ["submitted", "auto_submitted"] } } },
        { $unwind: "$tasks" },
        { $match: { "tasks.status": "completed" } },
        { $count: "count" }
      ]),
      AdminMicroTask.countDocuments({ submittedBy: new Types.ObjectId(userId) })
    ]);

    const totalTasks = assignmentTasksCount + (workLogTasksResult[0]?.count || 0) + adminMicroTasksCount;
    return ok("User retrieved successfully", { ...user, totalLogs, totalTasks });
  }

  if (path === "/admin/logs/all") {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const limitNum = boundedNumber(query.get("limit"), 20, 100);
    const skipNum = parseInt(query.get("skip") || "", 10) || 0;
    const filter: Record<string, unknown> = {};
    const userId = query.get("userId");
    const status = query.get("status");
    const startDate = query.get("startDate");
    const endDate = query.get("endDate");
    const sortBy = query.get("sortBy") || "date";
    const sortOrder = query.get("sortOrder") || "desc";
    const sortObj: Record<string, 1 | -1> = {};

    if (userId) filter.userId = new Types.ObjectId(userId);
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) (filter.date as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (filter.date as Record<string, unknown>).$lte = new Date(endDate);
    }
    if (sortBy === "date") sortObj.date = sortOrder === "asc" ? 1 : -1;
    else if (sortBy === "status") sortObj.status = sortOrder === "asc" ? 1 : -1;
    else if (sortBy === "userId") sortObj.userId = sortOrder === "asc" ? 1 : -1;

    const logs = await WorkLog.find(filter)
      .select("userId date status tasks state submittedAt createdAt")
      .populate("userId", "name email team")
      .sort(sortObj)
      .limit(limitNum)
      .skip(skipNum)
      .lean();

    const total = await WorkLog.countDocuments(filter);

    logActivity(request, {
      userId: auth.user.userId,
      action: "view_logs",
      resourceType: "worklog",
      details: { filter },
    });

    return ok("All logs retrieved successfully", logs, 200, {
      total,
      limit: limitNum,
      skip: skipNum,
    });
  }

  if (path === "/admin/logs/today") {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const limitNum = boundedNumber(query.get("limit"), 20, 100);
    const skipNum = parseInt(query.get("skip") || "", 10) || 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const filter: Record<string, unknown> = {
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    };
    const userId = query.get("userId");
    const status = query.get("status");
    if (userId) filter.userId = new Types.ObjectId(userId);
    if (status) filter.status = status;

    const logs = await WorkLog.find(filter)
      .select("userId date status tasks state submittedAt createdAt")
      .populate("userId", "name email team")
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .lean();

    const total = await WorkLog.countDocuments(filter);

    return ok("Today logs retrieved successfully", logs, 200, {
      total,
      limit: limitNum,
      skip: skipNum,
    });
  }

  if (path === "/admin/seo-reports") {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const limitNum = boundedNumber(query.get("limit"), 20, 100);
    const skipNum = parseInt(query.get("skip") || "", 10) || 0;
    const userId = query.get("userId");
    const department = query.get("department") || "SEO";
    const date = query.get("date");

    const userFilter: Record<string, unknown> = {
      role: "employee",
      team: { $regex: `^${department}$`, $options: "i" },
    };
    if (userId) userFilter._id = new Types.ObjectId(userId);

    const seoUsers = await User.find(userFilter).select("_id");
    const filter: Record<string, unknown> = {
      userId: { $in: seoUsers.map((u) => u._id) },
    };

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      filter.date = { $gte: dayStart, $lte: dayEnd };
    }

    const logs = await WorkLog.find(filter)
      .populate("userId", "name email team")
      .sort({ date: -1, createdAt: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .lean();
    const total = await WorkLog.countDocuments(filter);

    return ok("SEO reports retrieved successfully", logs, 200, {
      total,
      limit: limitNum,
      skip: skipNum,
    });
  }

  if (path === "/admin/activity-logs") {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const limitNum = boundedNumber(query.get("limit"), 50, 200);
    const skipNum = parseInt(query.get("skip") || "", 10) || 0;
    const filter: Record<string, unknown> = {};
    const userId = query.get("userId");
    const action = query.get("action");
    const startDate = query.get("startDate");
    const endDate = query.get("endDate");

    if (userId) filter.userId = new Types.ObjectId(userId);
    if (action) filter.action = action;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) (filter.timestamp as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) (filter.timestamp as Record<string, unknown>).$lte = new Date(endDate);
    }

    const logs = await ActivityLog.find(filter)
      .populate("userId", "name email")
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .skip(skipNum)
      .lean();
    const total = await ActivityLog.countDocuments(filter);

    return ok("Activity logs retrieved successfully", logs, 200, {
      total,
      limit: limitNum,
      skip: skipNum,
    });
  }


  if (path === "/notifications") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const notifications = await Notification.find({ userId: auth.user.userId })
      .populate({
        path: "messageId",
        populate: { path: "senderId", select: "name email" }
      })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();


    return ok("Notifications retrieved", notifications);
  }

  if (path === "/users/search") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const q = query.get("q") || "";
    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ],
      isActive: true
    }).select("name email role").limit(10);

    return ok("Users found", users);
  }

  if (path === "/messages/conversations") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    // Find all users the current user has sent/received messages from in 'direct' context
    const currentUserId = new Types.ObjectId(auth.user.userId);
    
    // Aggregation to find latest messages and unread counts
    const conversations = await Message.aggregate([
      {
        $match: {
          contextType: "direct",
          deletedBy: { $ne: currentUserId },
          $or: [
            { senderId: currentUserId },
            { receiverIds: currentUserId }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", currentUserId] },
              { $arrayElemAt: ["$receiverIds", 0] },
              "$senderId"
            ]
          },
          lastMessage: { $first: "$message" },
          lastMessageAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$senderId", currentUserId] },
                    { $not: { $in: [currentUserId, { $ifNull: ["$readBy", []] }] } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          lastMessage: 1,
          lastMessageAt: 1,
          unreadCount: 1,
          "user.name": 1,
          "user.email": 1,
          "user.role": 1,
          "user._id": 1
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    return ok("Conversations retrieved", conversations);
  }


  // GET /assignments/:id/tasks
  const assignmentTasksMatch = path.match(/^\/assignments\/([^/]+)\/tasks$/);
  if (assignmentTasksMatch) {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;
    
    const assignmentId = assignmentTasksMatch[1];
    const tasks = await Task.find({ assignmentId }).sort({ createdAt: 1 });
    return ok("Assignment tasks retrieved", tasks);
  }


  if (path === "/master-admin/stats") {
    const auth = requireMasterAdmin(request);
    if (auth.response) return auth.response;

    // HIGH-PERFORMANCE CACHE: Return cached stats if they exist and are fresh (< 5 mins)
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    if (global.masterStatsCache && (Date.now() - global.masterStatsCache.timestamp < CACHE_TTL)) {
      return ok("Master stats retrieved (cached)", global.masterStatsCache.data);
    }

    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "pending" });
    const inProgressTasks = await Task.countDocuments({ status: "in_progress" });
    const completedTasks = await Task.countDocuments({ status: "completed" });
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    // Performance overview: Top performers based on completed tasks
    const performance = await Task.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: "$assignedTo", completedCount: { $sum: 1 } } },
      { $sort: { completedCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          name: "$user.name",
          role: "$user.role",
          completedCount: 1
        }
      }
    ]);

    const stats = {
      tasks: {
        total: totalTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks
      },
      users: {
        total: totalUsers,
        active: activeUsers
      },
      performance
    };

    // Update Cache
    global.masterStatsCache = {
      data: stats,
      timestamp: Date.now()
    };

    return ok("Master stats retrieved", stats);
  }

  // GET /admin/micro-tasks — Admin sees their own submissions; Master Admin sees all
  if (path === "/admin/micro-tasks") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    if (auth.user.role !== "admin" && auth.user.role !== "master_admin") {
      return fail(403, "Access denied");
    }

    const limitNum = boundedNumber(query.get("limit"), 20, 100);
    const skipNum = parseInt(query.get("skip") || "", 10) || 0;
    const statusFilter = query.get("status");
    const dateFilter = query.get("date"); // YYYY-MM-DD

    const filter: any = {};

    // Admins only see their own; Master Admins see all unless userId is provided
    if (auth.user.role === "admin") {
      filter.submittedBy = new Types.ObjectId(auth.user.userId);
    } else if (query.get("userId")) {
      filter.submittedBy = new Types.ObjectId(query.get("userId")!);
    }

    if (statusFilter && statusFilter !== "all") {
      filter.status = statusFilter;
    }

    if (dateFilter) {
      const start = new Date(dateFilter);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter);
      end.setHours(23, 59, 59, 999);
      filter.taskDate = { $gte: start, $lte: end };
    }

    const [microTasks, total] = await Promise.all([
      AdminMicroTask.find(filter)
        .populate("submittedBy", "name email team role")
        .sort({ submittedAt: -1 })
        .limit(limitNum)
        .skip(skipNum)
        .lean(),
      AdminMicroTask.countDocuments(filter),
    ]);

    return ok("Micro-tasks retrieved", microTasks, 200, {
      total,
      limit: limitNum,
      skip: skipNum,
    });
  }

    return fail(404, "Route not found");
  } catch (error: any) {
    console.error(`GET ${getPath(context)} error:`, error);
    return fail(500, "Internal Server Error", error.message);
  }
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    await connectDB();
    const path = getPath(context);
    const body = await readBody(request);
    const method = request.method;


  if (path === "/auth/password") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) return fail(400, "Current and new passwords are required");

    const user = await User.findById(auth.user.userId).select("+password");
    if (!user) return fail(404, "User not found");

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return fail(400, "Incorrect current password");

    user.password = newPassword;
    await user.save();

    logActivity(request, {
      userId: auth.user.userId,
      action: "password_change",
      resourceType: "user",
      resourceId: auth.user.userId,
    });

    return ok("Password updated successfully");
  }

  const assignmentDetailMatch = path.match(/^\/assignments\/([^/]+)$/);
  if (assignmentDetailMatch) {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;
    const assignmentId = assignmentDetailMatch[1];

    const { assignedTo, title, tasks: tasksData, priority, projectId } = body;
    if (!assignedTo || !title || !tasksData || !Array.isArray(tasksData)) {
      return fail(400, "Missing required fields");
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return fail(404, "Assignment not found");

    if (assignment.assignedBy.toString() !== auth.user.userId && auth.user.role !== "master_admin") {
      return fail(403, "Not authorized to edit this assignment");
    }

    // Verify Assignee is still active
    const targetUser = await User.findById(assignedTo);
    if (!targetUser) return fail(400, "Assigned user not found");
    if (targetUser.isActive === false) {
      return fail(403, "Access Revoked: Cannot assign tasks to an inactive user.");
    }

    assignment.title = title.trim();
    assignment.assignedTo = new Types.ObjectId(assignedTo);
    if (priority) assignment.priority = priority;
    if (projectId) assignment.projectId = new Types.ObjectId(projectId);
    await assignment.save();

    const existingTasks = await Task.find({ assignmentId });
    const existingTaskIds = existingTasks.map(t => t._id.toString());
    const incomingTaskIds = tasksData.filter(t => t._id).map(t => t._id);

    const tasksToDelete = existingTaskIds.filter(id => !incomingTaskIds.includes(id));
    if (tasksToDelete.length > 0) {
      await Task.deleteMany({ _id: { $in: tasksToDelete.map(id => new Types.ObjectId(id)) } });
    }

    const parseDate = (d: string) => {
      if (!d) return null;
      if (d.includes("-") && d.split("-")[0].length === 4) return new Date(d);
      const p = d.split("/");
      if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
      return new Date(d);
    };

    for (const tData of tasksData) {
      const deadline = parseDate(tData.deadline);
      if (tData._id) {
        await Task.findByIdAndUpdate(tData._id, {
          title: tData.title?.trim(),
          description: tData.description?.trim(),
          priority: tData.priority?.toLowerCase() || "medium",
          deadline: deadline || undefined
        });
      } else {
        const newTask = new Task({
          assignmentId: assignment._id,
          title: tData.title?.trim(),
          description: (tData.description || "No description").trim(),
          priority: tData.priority?.toLowerCase() || "medium",
          deadline: deadline || new Date(),
          status: "pending",
          timeSpent: 0
        });
        await newTask.save();
      }
    }

    logActivity(request, {
      userId: auth.user.userId,
      action: "update_assignment",
      resourceType: "user",
      resourceId: assignmentId,
    });

    return ok("Assignment updated successfully");
  }

  const projectDetailMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectDetailMatch) {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;
    const projectId = projectDetailMatch[1];

    const project = await Project.findById(projectId);
    if (!project) return fail(404, "Project not found");

    // Permission check: Master Admin OR Admin who is a member
    const isMember = project.members.some((m: any) => m.toString() === auth.user.userId);
    const isMaster = auth.user.role === "master_admin";
    const isAdminMember = auth.user.role === "admin" && isMember;

    if (!isMaster && !isAdminMember) {
      return fail(403, "You do not have permission to update this project");
    }

    // Admins can ONLY update members
    if (isAdminMember && !isMaster) {
      const { members } = body;
      if (members) {
        project.members = members.map((m: string) => new Types.ObjectId(m));
        await project.save();
        return ok("Members updated successfully", project);
      }
      return fail(400, "Admins can only update the project member list");
    }

    // Master Admin can update anything
    Object.assign(project, body);
    await project.save();
    return ok("Project updated successfully", project);
  }

  const adminStatusMatch = path.match(/^\/admin\/users\/([^/]+)\/status$/);
  if (adminStatusMatch) {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;

    const userId = adminStatusMatch[1];
    if (!Types.ObjectId.isValid(userId)) {
      return fail(404, "User not found");
    }

    const { isActive } = body;
    if (typeof isActive !== "boolean") return fail(400, "isActive must be a boolean");

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive, leftAt: !isActive ? new Date() : null },
      { new: true }
    ).select("-password");
    if (!user) return fail(404, "User not found");

    logActivity(request, {
      userId: auth.user.userId,
      action: "role_change",
      resourceType: "user",
      resourceId: adminStatusMatch[1],
      details: { isActive },
    });

    return ok("User status updated successfully", user);
  }

  const workLogTaskMatch = path.match(/^\/work-logs\/([^/]+)\/tasks\/([^/]+)$/);
  if (workLogTaskMatch) {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const [, logId, taskId] = workLogTaskMatch;
    if (!Types.ObjectId.isValid(logId)) {
      return fail(404, "Work log not found");
    }
    const workLog = await WorkLog.findById(logId);
    if (!workLog) return fail(404, "Work log not found");

    if (workLog.userId.toString() !== auth.user.userId && auth.user.role !== "admin") {
      return fail(403, "Not authorized to update this log");
    }

    const { status, notes } = body;
    const taskIndex = workLog.tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) return fail(404, "Task not found");

    if (status) {
      workLog.tasks[taskIndex].status = status;
      if (status === "completed") {
        workLog.tasks[taskIndex].completedAt = new Date();
      } else {
        workLog.tasks[taskIndex].completedAt = undefined;
      }
    }
    if (notes !== undefined) workLog.tasks[taskIndex].notes = notes;

    await workLog.save();

    logActivity(request, {
      userId: auth.user.userId,
      action: "update_task",
      resourceType: "worklog",
      resourceId: logId,
      details: { taskId, status },
    });

    return ok("Task updated successfully", workLog.tasks[taskIndex]);
  }


  const workLogSubmitMatch = path.match(/^\/work-logs\/([^/]+)\/submit$/);
  if (workLogSubmitMatch) {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const logId = workLogSubmitMatch[1];
    const { isAutoSubmit } = body; // Optional flag to indicate auto-submission

    let workLog;
    if (Types.ObjectId.isValid(logId)) {
      workLog = await WorkLog.findById(logId);
    } else {
      workLog = await WorkLog.findOne({ id: logId });
    }
    
    if (!workLog) return fail(404, "Work log not found");

    if (workLog.userId.toString() !== auth.user.userId && !isAutoSubmit) {
      return fail(403, "Not authorized to submit this log");
    }

    if (isAutoSubmit) {
      workLog.state = "auto_submitted";
      workLog.autoSubmittedAt = new Date();
    } else {
      workLog.state = "submitted";
      workLog.submittedAt = new Date();
    }
    
    await workLog.save();

    logActivity(request, {
      userId: auth.user.userId,
      action: isAutoSubmit ? "auto_submit_log" : "submit_log",
      resourceType: "worklog",
      resourceId: logId,
    });

    return ok(
      isAutoSubmit ? "Work log auto-submitted successfully" : "Work log submitted successfully",
      workLog
    );
  }

  if (path === "/notifications/read-all") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    await Notification.updateMany({ userId: auth.user.userId, isRead: false }, { isRead: true });
    return ok("All notifications marked as read");
  }

  const notificationReadMatch = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (notificationReadMatch) {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const notificationId = notificationReadMatch[1];
    await Notification.findOneAndUpdate({ _id: notificationId, userId: auth.user.userId }, { isRead: true });
    return ok("Notification marked as read");
  }

  if (path === "/messages/read") {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const { contextType, contextId, senderId } = body;
    const currentUserId = new Types.ObjectId(auth.user.userId);

    const filter: any = {
      contextType,
      readBy: { $ne: currentUserId }
    };

    if (contextId) filter.contextId = contextId;
    if (senderId) filter.senderId = new Types.ObjectId(senderId);

    await Message.updateMany(filter, { $addToSet: { readBy: currentUserId } });
    
    // Also mark related notifications as read
    const messages = await Message.find(filter).select("_id");
    if (messages.length > 0) {
      await Notification.updateMany(
        { userId: currentUserId, messageId: { $in: messages.map(m => m._id) } },
        { isRead: true }
      );
    }

    return ok("Messages marked as read");
  }


  // PUT /tasks/:id/timer

  const microTaskUpdateMatch = path.match(/^\/admin\/micro-tasks\/([^/]+)$/);
  if (microTaskUpdateMatch) {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;
    const microTaskId = microTaskUpdateMatch[1];

    const microTask = await AdminMicroTask.findById(microTaskId);
    if (!microTask) return fail(404, "Micro-task not found");

    if (microTask.submittedBy.toString() !== auth.user.userId && auth.user.role !== "master_admin") {
      return fail(403, "Not authorized to update this micro-task");
    }

    const fields = ["title", "description", "proofLinks", "proofFiles", "timeSpent", "taskDate"];
    fields.forEach(f => {
      if (body[f] !== undefined) (microTask as any)[f] = body[f];
    });

    await microTask.save();
    return ok("Micro-task updated successfully", microTask);
  }

  // PUT /admin/micro-tasks/:id/review — Master Admin reviews/acknowledges a micro-task
  const microTaskReviewMatch = path.match(/^\/admin\/micro-tasks\/([^/]+)\/review$/);
  if (microTaskReviewMatch) {
    const auth = requireMasterAdmin(request);
    if (auth.response) return auth.response;

    const microTaskId = microTaskReviewMatch[1];
    if (!Types.ObjectId.isValid(microTaskId)) {
      return fail(400, "Invalid micro-task ID");
    }

    const { status, masterAdminNote } = body;

    if (!status || !["reviewed", "acknowledged"].includes(status)) {
      return fail(400, "Status must be 'reviewed' or 'acknowledged'");
    }

    const microTask = await AdminMicroTask.findByIdAndUpdate(
      microTaskId,
      {
        status,
        masterAdminNote: masterAdminNote?.trim() || "",
        reviewedAt: new Date(),
      },
      { new: true }
    ).populate("submittedBy", "name email team role");

    if (!microTask) return fail(404, "Micro-task not found");

    logActivity(request, {
      userId: auth.user.userId,
      action: "review_micro_task",
      resourceType: "task",
      resourceId: microTaskId,
      details: { status, microTaskTitle: microTask.title },
    });

    return ok("Micro-task reviewed successfully", microTask);
  }

    return fail(404, "Route not found");
  } catch (error: any) {
    console.error(`PUT ${getPath(context)} error:`, error);
    return fail(500, "Internal Server Error", error.message);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await connectDB();
    const path = getPath(context);
    const method = request.method;

  const conversationMatch = path.match(/^\/messages\/conversation\/([^/]+)$/);
  if (conversationMatch) {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;

    const otherUserId = conversationMatch[1];
    if (!Types.ObjectId.isValid(otherUserId)) return fail(404, "User not found");

    const currentUserId = new Types.ObjectId(auth.user.userId);
    const targetUserId = new Types.ObjectId(otherUserId);

    await Message.updateMany(
      { 
        $or: [
          { senderId: currentUserId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: currentUserId }
        ]
      },
      { $set: { isDeletedBy: currentUserId } }
    );

    return ok("Conversation cleared");
  }

  const assignmentDeleteMatch = path.match(/^\/assignments\/([^/]+)$/);
  if (assignmentDeleteMatch) {
    const auth = requireMasterAdmin(request);
    if (auth.response) return auth.response;
    const assignmentId = assignmentDeleteMatch[1];

    await Task.deleteMany({ assignmentId: new Types.ObjectId(assignmentId) });
    await Assignment.findByIdAndDelete(assignmentId);

    logActivity(request, {
      userId: auth.user.userId,
      action: "delete_assignment",
      resourceType: "user",
      resourceId: assignmentId,
    });

    return ok("Assignment and its tasks deleted successfully");
  }

  const projectDetailMatch = path.match(/^\/projects\/([^/]+)$/);
  if (projectDetailMatch) {
    const auth = requireAuth(request);
    if (auth.response) return auth.response;
    const projectId = projectDetailMatch[1];

    if (auth.user.role !== "master_admin") return fail(403, "Only Master Admins can delete projects");
    await Project.findByIdAndDelete(projectId);
    return ok("Project deleted successfully");
  }


  const microTaskDeleteMatch = path.match(/^\/admin\/micro-tasks\/([^/]+)$/);
  if (microTaskDeleteMatch) {
    const auth = requireAdmin(request);
    if (auth.response) return auth.response;
    const microTaskId = microTaskDeleteMatch[1];

    const microTask = await AdminMicroTask.findById(microTaskId);
    if (!microTask) return fail(404, "Micro-task not found");

    if (microTask.submittedBy.toString() !== auth.user.userId && auth.user.role !== "master_admin") {
      return fail(403, "Not authorized to delete this micro-task");
    }

    await AdminMicroTask.findByIdAndDelete(microTaskId);
    return ok("Micro-task deleted successfully");
  }

  return fail(404, "Route not found");
  } catch (error: any) {
    console.error(`DELETE ${getPath(context)} error:`, error);
    return fail(500, "Internal Server Error", error.message);
  }
}
