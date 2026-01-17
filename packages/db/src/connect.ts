import mongoose, { Mongoose } from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'local-url'

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined')
}

/**
 * We store the cached connection on globalThis
 * so it survives hot reloads and lambda re-use
 */
declare global {
  // eslint-disable-next-line no-var
  var mongooseConn:
    | {
        conn: Mongoose | null
        promise: Promise<Mongoose> | null
      }
    | undefined
}

let cached = globalThis.mongooseConn

if (!cached) {
  cached = globalThis.mongooseConn = {
    conn: null,
    promise: null,
  }
}

/**
 * Connect to MongoDB using a singleton pattern
 */
export async function connectMongo(): Promise<Mongoose> {
  if (cached!.conn) {
    return cached!.conn
  }

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  cached!.conn = await cached!.promise
  return cached!.conn
}
