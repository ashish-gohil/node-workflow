import mongoose, { Mongoose } from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'local-url'

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined')
}

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

export async function connectMongo(): Promise<Mongoose> {
  if (cached!.conn) {
    return cached!.conn
  }

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(
      MONGODB_URI,
      {
        bufferCommands: false,
      } as mongoose.ConnectOptions
    )
  }

  cached!.conn = await cached!.promise
  return cached!.conn
}
