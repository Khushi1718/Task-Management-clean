import mongoose, { Document, Model, Schema } from "mongoose";

export type LogStatus = "completed" | "in_progress" | "pending";
export type LogState = "draft" | "submitted" | "auto_submitted";
export type AttachmentType = "image" | "link" | "document" | "spreadsheet" | "presentation";

export interface IAttachment {
  id: string;
  name: string;
  url: string;
  type: AttachmentType;
}

export interface ISeoData {
  questionsAnswered: number;
  backlinksCreated: number;
  proofs: IAttachment[];
}

export interface ISubtask {
  id: string;
  title: string;
  completed: boolean;
  comment?: string;
}

export interface ITask {
  id: string;
  text: string;
  status: LogStatus;
  priority: "high" | "medium" | "low";
  notes?: string;
  subtasks?: ISubtask[];
  completedAt?: Date;
}

export interface IWorkLog extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  tasks: ITask[];
  meetingsAttended: number;
  focusForTomorrow?: string;
  status: LogStatus;
  date: Date;
  meetingNotes?: string;
  attachments?: IAttachment[];
  seoData?: ISeoData;
  state: LogState;
  submittedAt?: Date;
  autoSubmittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ["image", "link", "document", "spreadsheet", "presentation"],
      required: true,
    },
  },
  { _id: false }
);

const seoDataSchema = new Schema(
  {
    questionsAnswered: {
      type: Number,
      default: 0,
      min: 0,
    },
    backlinksCreated: {
      type: Number,
      default: 0,
      min: 0,
    },
    proofs: {
      type: [attachmentSchema],
      default: [],
    },
  },
  { _id: false }
);

const subtaskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    comment: String,
  },
  { _id: false }
);

const taskSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    status: {
      type: String,
      enum: ["completed", "in_progress", "pending"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    notes: String,
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },
    completedAt: Date,
  },
  { _id: false }
);

const workLogSchema = new Schema<IWorkLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    tasks: {
      type: [taskSchema],
      required: [true, "At least one task is required"],
      validate: {
        validator: (tasks: ITask[]) => tasks.length > 0,
        message: "At least one task is required",
      },
    },
    meetingsAttended: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    focusForTomorrow: String,
    status: {
      type: String,
      enum: {
        values: ["completed", "in_progress", "pending"],
        message: "Status must be completed, in_progress, or pending",
      },
      default: "completed",
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    meetingNotes: String,
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    seoData: {
      type: seoDataSchema,
      default: () => ({
        questionsAnswered: 0,
        backlinksCreated: 0,
        proofs: [],
      }),
    },
    state: {
      type: String,
      enum: ["draft", "submitted", "auto_submitted"],
      default: "draft",
      index: true,
    },
    submittedAt: Date,
    autoSubmittedAt: Date,
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for large-scale filtering
workLogSchema.index({ userId: 1, date: -1 });
workLogSchema.index({ userId: 1, status: 1, date: -1 });
workLogSchema.index({ state: 1, date: -1 });
workLogSchema.index({ status: 1, date: -1 });
workLogSchema.index({ date: -1, userId: 1 });
workLogSchema.index({ userId: 1, date: 1 }, { unique: true, sparse: true });

export default (mongoose.models.WorkLog as Model<IWorkLog>) || mongoose.model<IWorkLog>("WorkLog", workLogSchema);
