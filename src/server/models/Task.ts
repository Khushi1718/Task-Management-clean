import mongoose, { Document, Model, Schema } from "mongoose";

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface ITask extends Document {
  title: string;
  description: string;
  assignmentId: mongoose.Types.ObjectId;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: Date;
  remarks: string;
  evidence?: string;
  evidenceFiles?: any[]; 
  completionRemarks?: string;
  completedAt?: Date;
  timerStartedAt?: Date;
  timeSpent: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    deadline: {
      type: Date,
      required: [true, "Deadline is required"],
    },
    remarks: {
      type: String,
      default: "",
    },
    timerStartedAt: {
      type: Date,
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
    evidence: {
      type: String,
      default: "",
    },
    evidenceFiles: [
      {
        id: String,
        name: String,
        url: String,
        type: { type: String },
      },
    ],
    completionRemarks: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups
taskSchema.index({ assignmentId: 1, status: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ completedAt: -1 });

if (mongoose.models.Task) {
  delete (mongoose.models as any).Task;
}
export default mongoose.model<ITask>("Task", taskSchema);
