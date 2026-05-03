import mongoose, { Document, Model, Schema } from "mongoose";

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  resourceType: "worklog" | "user" | "system" | "task" | "assignment";
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "login",
        "logout",
        "create_log",
        "update_log",
        "delete_log",
        "view_logs",
        "view_users",
        "update_user",
        "delete_user",
        "role_change",
        "password_change",
        "create_task",
        "update_task",
        "delete_task",
      ],
    },
    resourceType: {
      type: String,
      enum: ["worklog", "user", "system", "task", "assignment"],
      required: true,
    },
    resourceId: String,
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });

export default (mongoose.models.ActivityLog as Model<IActivityLog>) || mongoose.model<IActivityLog>("ActivityLog", activityLogSchema);
