import mongoose, { Mongoose } from "mongoose";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

/**
 * SSM client (reuse across invocations)
 */
const ssm = new SSMClient({});

/**
 * Cache secrets & mongoose connection across Lambda invocations
 */
let cachedMongoUri: string | null = null;

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
 * Fetch MongoDB URI from SSM (once per container)
 */
async function getMongoUri(): Promise<string> {
  if (cachedMongoUri) {
    return cachedMongoUri;
  }

  const paramName = process.env.MONGODB_URI;

  if (!paramName) {
    throw new Error("MONGODB_URI env var (SSM parameter name) is not defined");
  }

  const res = await ssm.send(
    new GetParameterCommand({
      Name: paramName,
      WithDecryption: true,
    })
  );
  console.log(res)
  const value = res.Parameter?.Value;

  if (!value) {
    throw new Error(`SSM parameter ${paramName} has no value`);
  }

  cachedMongoUri = value;
  return value;
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
 * Connect to MongoDB (Lambda-safe singleton)
 */
export async function connectMongo(): Promise<Mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const mongoUri = await getMongoUri();
    console.log("mongoDB URI", mongoUri)
    cached!.promise = mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}
