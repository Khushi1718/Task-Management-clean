import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "master_admin" | "admin" | "employee";
  team: string;
  isActive: boolean;
  joinedAt: Date;
  leftAt?: Date;
  totalLogs: number;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["master_admin", "admin", "employee"],
        message: "Role must be master_admin, admin, or employee",
      },
      default: "employee",
    },
    team: {
      type: String,
      required: [true, "Team is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    totalLogs: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-speed filtering in Admin Dashboards
userSchema.index({ role: 1 });
userSchema.index({ team: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ email: 1 }, { unique: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const bcrypt = await import("bcryptjs");
    const salt = await bcrypt.default.genSalt(10);
    this.password = await bcrypt.default.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.default.compare(enteredPassword, this.password);
};

export default (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", userSchema);
