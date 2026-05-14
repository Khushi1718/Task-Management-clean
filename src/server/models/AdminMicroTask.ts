import mongoose, { Document, Model, Schema } from "mongoose";

export type MicroTaskStatus = "pending" | "reviewed" | "acknowledged";

export interface IProofAttachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "link" | "document" | "spreadsheet" | "presentation";
}

export interface IAdminMicroTask extends Document {
  submittedBy: mongoose.Types.ObjectId; // Admin who submitted
  title: string;
  description?: string;
  proofLinks: string[]; // optional proof URLs
  proofFiles: IProofAttachment[]; // optional uploaded files/PDFs
  timeSpent?: number; // time spent in minutes
  taskDate: Date; // date of the task
  status: MicroTaskStatus;
  masterAdminNote?: string; // master admin feedback
  reviewedAt?: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const proofAttachmentSchema = new Schema(
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

const adminMicroTaskSchema = new Schema<IAdminMicroTask>(
  {
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Submitter ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [300, "Title cannot exceed 300 characters"],
    },
    description: {
      type: String,
      default: "",
    },
    proofLinks: {
      type: [String],
      default: [],
    },
    proofFiles: {
      type: [proofAttachmentSchema],
      default: [],
    },
    timeSpent: {
      type: Number,
      default: 0,
    },
    taskDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "acknowledged"],
      default: "acknowledged",
      index: true,
    },
    masterAdminNote: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

adminMicroTaskSchema.index({ submittedBy: 1, submittedAt: -1 });
adminMicroTaskSchema.index({ status: 1, submittedAt: -1 });

export default (mongoose.models.AdminMicroTask as Model<IAdminMicroTask>) ||
  mongoose.model<IAdminMicroTask>("AdminMicroTask", adminMicroTaskSchema);
