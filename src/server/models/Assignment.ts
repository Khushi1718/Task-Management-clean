import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAssignment extends Document {
  assignedBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  title: string; // e.g. "Weekly SEO Sprint"
  status: "pending" | "in_progress" | "completed";
  projectId?: mongoose.Types.ObjectId;
  priority?: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: false, // Optional for backward compatibility/one-offs
    },
    title: {
      type: String,
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
  },
  { timestamps: true }
);

// High-speed indexes for assignment tracking
assignmentSchema.index({ status: 1 });
assignmentSchema.index({ projectId: 1 });
assignmentSchema.index({ createdAt: -1 });

if (mongoose.models.Assignment) {
  delete (mongoose.models as any).Assignment;
}
const Assignment: Model<IAssignment> = mongoose.model<IAssignment>("Assignment", assignmentSchema);
export default Assignment;
