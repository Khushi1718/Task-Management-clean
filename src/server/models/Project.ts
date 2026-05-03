import mongoose, { Schema, Document, Types, Model } from "mongoose";

export interface IProject extends Document {
  name: string;
  description: string;
  clientName?: string;
  members: Types.ObjectId[]; // Admins and Employees
  status: "active" | "completed" | "on_hold" | "archived";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    clientName: { type: String, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["active", "completed", "on_hold", "archived"],
      default: "active",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default (mongoose.models.Project as Model<IProject>) || mongoose.model<IProject>("Project", ProjectSchema);

