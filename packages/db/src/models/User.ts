import { Schema, model, models, type InferSchemaType, } from "mongoose";

/**
 * Supported authentication providers
 */
export const AuthProviders = ["credentials", "google"] as const;
export type AuthProvider = (typeof AuthProviders)[number];

/**
 * User Schema
 */
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: function () {
        return this.provider === "credentials";
      },
    },

    name: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
    },

    provider: {
      type: String,
      enum: AuthProviders,
      required: true,
      default: "credentials"
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * Strongly typed User document
 */
export type IUser = InferSchemaType<typeof UserSchema>;

/**
 * Safe model export (prevents OverwriteModelError)
 */
export const UserModel = models.User ?? model<IUser>("User", UserSchema);
