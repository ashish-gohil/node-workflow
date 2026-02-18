import mongoose, { Mongoose } from "mongoose";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

/**
 * Reuse SSM client across Lambda invocations
 */
const ssm = new SSMClient({});

/**
 * Cache Mongo URI (prevents repeated SSM calls)
 */
let cachedMongoUri: string | null = null;

/**
 * Global mongoose cache (prevents multiple DB connections)
 */
declare global {
  // eslint-disable-next-line no-var
  var mongooseConn:
    | {
      conn: Mongoose | null;
      promise: Promise<Mongoose> | null;
    }
    | undefined;
}

/**
 * Initialize global cache
 */
let cached = globalThis.mongooseConn;

if (!cached) {
  cached = globalThis.mongooseConn = {
    conn: null,
    promise: null,
  };
}

/**
 * Get MongoDB URI
 *
 * Priority order:
 *
 * 1. LOCAL → use MONGO_URL directly from .env
 * 2. LAMBDA → use MONGODB_URI as SSM parameter name and fetch value
 */
async function getMongoUri(): Promise<string> {
  /**
   * Use cached value if available
   */
  if (cachedMongoUri) {
    return cachedMongoUri;
  }

  /**
   * STEP 1: Check LOCAL env variable first
   */
  const localMongoUrl = process.env.MONGO_URL;

  if (localMongoUrl) {
    console.log("Using MongoDB URI from local .env (MONGO_URL)");
    cachedMongoUri = localMongoUrl;
    return cachedMongoUri;
  }

  /**
   * STEP 2: If not local, fetch from SSM using parameter name
   */
  const ssmParamName = process.env.MONGODB_URI;

  if (!ssmParamName) {
    throw new Error(
      "Neither MONGO_URL nor MONGODB_URI is defined in environment variables"
    );
  }

  console.log("Fetching MongoDB URI from AWS SSM:", ssmParamName);

  const res = await ssm.send(
    new GetParameterCommand({
      Name: ssmParamName,
      WithDecryption: true,
    })
  );

  const value = res.Parameter?.Value;

  if (!value) {
    throw new Error(`SSM parameter "${ssmParamName}" has no value`);
  }

  cachedMongoUri = value;

  return cachedMongoUri;
}

/**
 * Connect to MongoDB (Singleton connection)
 *
 * Safe for:
 * - Local development
 * - Lambda
 * - Hot reload
 */
export async function connectMongo(): Promise<Mongoose> {
  /**
   * If already connected, reuse connection
   */
  if (cached!.conn) {
    return cached!.conn;
  }

  /**
   * If connection in progress, wait for it
   */
  if (!cached!.promise) {
    const mongoUri = await getMongoUri();

    console.log("Connecting to MongoDB...");

    cached!.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
  }

  cached!.conn = await cached!.promise;

  console.log("MongoDB connected");

  return cached!.conn;
}
