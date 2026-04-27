import {
  Model,
  Schema,
  model,
  models,
  type InferSchemaType,
} from "mongoose";

/* -------------------- Auth provider types -------------------- */

/**
 * Supported authentication providers.
 * "credentials" → email + password (passwordHash required)
 * "google"      → OAuth via Google (passwordHash is null)
 */
export const AuthProviders = ["credentials", "google"] as const;
export type AuthProvider = (typeof AuthProviders)[number];

/* -------------------- Schema -------------------- */

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,   // enforced at DB level — also acts as an implicit index
      lowercase: true, // normalize before save so "A@B.com" === "a@b.com"
      trim: true,
    },

    /**
     * Bcrypt hash of the user's password.
     * Only present for "credentials" provider — null for OAuth users.
     * NEVER store or log the plaintext password.
     * Strip this field in toJSON (see transform below).
     */
    passwordHash: {
      type: String,
      // Required only when signing up with email/password
      required: function (this: { provider: AuthProvider }) {
        return this.provider === "credentials";
      },
      default: null,
    },

    name: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * Profile picture URL.
     * For Google OAuth: populated automatically from the Google profile.
     * For credentials: user-supplied URL or null.
     */
    image: {
      type: String,
      default: null,
    },

    /**
     * Which auth strategy created this account.
     * Determines whether passwordHash is expected and which
     * OAuth token fields may be present in the future.
     */
    provider: {
      type: String,
      enum: AuthProviders,
      required: true,
      default: "credentials",
    },
  },
  {
    timestamps: true,  // createdAt + updatedAt
    versionKey: false, // no __v field
  }
);

/* -------------------- Safety: strip passwordHash from serialized output -------------------- */
// Prevents accidentally leaking the hash through API responses.
// To read the hash (e.g. during login), use .select("+passwordHash") in your query
// — but since it's not set to select: false here, you only need the transform.

UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

UserSchema.set("toObject", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

/* -------------------- Types -------------------- */

/**
 * Strongly typed User document — inferred directly from the schema so
 * types never drift from the actual shape stored in MongoDB.
 */
export type IUser = InferSchemaType<typeof UserSchema>;

/**
 * IUser without passwordHash — safe to pass to API responses / session tokens.
 * Use this as the return type of any function that serializes a user.
 */
export type IPublicUser = Omit<IUser, "passwordHash">;

/* -------------------- Singleton export -------------------- */

export const UserModel: Model<IUser> =
  models.User ?? model<IUser>("User", UserSchema);