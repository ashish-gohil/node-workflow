import { Model, Schema, model, models } from "mongoose";

/* -------------------- Types -------------------- */

export enum CredentialType {
    ApiKey = "api_key",
    HttpBasic = "http_basic",
    HttpBearer = "http_bearer",
    OAuth2 = "oauth2",
    Smtp = "smtp",
    // Add more as you implement node integrations
}

export interface ICredentialMeta {
    // Non-sensitive display info — stored unencrypted for UI use
    accountName?: string;
    scopes?: string[];
    expiresAt?: Date | null;
}

export interface ICredential {
    credentialId: string;
    userId: string;
    name: string; // user-given label, e.g. "HubSpot Production"
    type: CredentialType;

    // AES-256-CBC encrypted JSON string.
    // Format: "iv_hex:ciphertext_hex"
    // Decrypt with CREDENTIAL_ENCRYPTION_KEY env var before injecting into nodes.
    // NEVER return this field from the API — strip it in serialization.
    encryptedData: string;

    // Safe-to-expose metadata for dropdowns and UI display
    meta: ICredentialMeta;
}

/* -------------------- Sub-schemas -------------------- */

const CredentialMetaSchema = new Schema<ICredentialMeta>(
    {
        accountName: String,
        scopes: { type: [String], default: [] },
        expiresAt: { type: Date, default: null },
    },
    { _id: false }
);

/* -------------------- Credential Schema -------------------- */

const CredentialSchema = new Schema<ICredential>(
    {
        credentialId: {
            type: String,
            required: true,
            unique: true,
        },

        userId: {
            type: String,
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        type: {
            type: String,
            required: true,
            enum: Object.values(CredentialType),
        },

        // Never expose via API. Strip in toJSON transform below.
        encryptedData: {
            type: String,
            required: true,
        },

        meta: {
            type: CredentialMetaSchema,
            default: () => ({}),
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

/* -------------------- Safety: strip encryptedData from JSON output -------------------- */
// This prevents accidentally leaking the encrypted payload through API responses.
// You must explicitly select +encryptedData in queries where you need to decrypt.

CredentialSchema.set("toJSON", {
    transform: (_doc, ret) => {
        const safeRet: Partial<ICredential> = { ...ret };
        delete safeRet.encryptedData;
        return safeRet;
    },
});

CredentialSchema.set("toObject", {
    transform: (_doc, ret) => {
        const safeRet: Partial<ICredential> = { ...ret };
        delete safeRet.encryptedData;
        return safeRet;
    },
});

/* -------------------- Indexes -------------------- */

// List credentials in a user's credential picker, grouped by type
CredentialSchema.index({ userId: 1, type: 1 });

/* -------------------- Singleton Export -------------------- */

export const CredentialModel: Model<ICredential> =
    models.Credential ?? model<ICredential>("Credential", CredentialSchema);