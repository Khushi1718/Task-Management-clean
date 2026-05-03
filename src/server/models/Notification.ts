import mongoose, { Document, Model, Schema } from "mongoose";

export type NotificationType = "mention" | "message";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  messageId: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["mention", "message"],
      required: true,
    },
    messageId: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export default (mongoose.models.Notification as Model<INotification>) || mongoose.model<INotification>("Notification", notificationSchema);
