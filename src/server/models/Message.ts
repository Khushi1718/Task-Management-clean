import mongoose, { Document, Model, Schema } from "mongoose";

export type MessageContextType = "task" | "log" | "direct";

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverIds: mongoose.Types.ObjectId[];
  message: string;
  mentions: mongoose.Types.ObjectId[];
  contextType: MessageContextType;
  contextId?: string; // ID of the task or log
  readBy: mongoose.Types.ObjectId[];
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
  deletedBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverIds: [{
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    }],
    message: {
      type: String,
      required: true,
      trim: true,
    },
    mentions: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    contextType: {
      type: String,
      enum: ["task", "log", "direct"],
      required: true,
      index: true,
    },
    contextId: {
      type: String,
      index: true,
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    attachments: [{
      name: String,
      url: String,
      type: {
        type: String,
        enum: ["image", "link", "document", "spreadsheet", "presentation"],
      },
    }],
    deletedBy: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  {
    timestamps: true,
  }
);

// Compound index for faster context-based lookups
messageSchema.index({ contextType: 1, contextId: 1, createdAt: -1 });
// Compound index for direct messages
messageSchema.index({ receiverIds: 1, senderId: 1, createdAt: -1 });

export default (mongoose.models.Message as Model<IMessage>) || mongoose.model<IMessage>("Message", messageSchema);
