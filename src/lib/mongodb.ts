import mongoose from "mongoose";

const MONGODB_URI = process.env.DB_URI || "";

// If we reach this point and MONGODB_URI is empty, throw an error
if (!MONGODB_URI) {
	throw new Error("MongoDB URI is empty. Please check your .env.local file.");
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface CachedMongoose {
	conn: typeof mongoose | null;
	promise: Promise<typeof mongoose> | null;
}

let cached = global as typeof global & {
	mongoose?: CachedMongoose;
};

if (!cached.mongoose) {
	cached.mongoose = {
		conn: null,
		promise: null,
	};
}

async function dbConnect(): Promise<typeof mongoose> {
	if (cached.mongoose?.conn) {
		return cached.mongoose.conn;
	}

	if (!cached.mongoose?.promise) {
		const opts = {
			bufferCommands: false,
			dbName: process.env.DB_NAME as string,
		};

		cached.mongoose!.promise = mongoose
			.connect(MONGODB_URI as string, opts)
			.then((mongoose) => {
				return mongoose;
			});
	}

	try {
		cached.mongoose!.conn = await cached.mongoose!.promise;
	} catch (e) {
		cached.mongoose!.promise = null;
		throw e;
	}

	return cached.mongoose!.conn!; // Non-null assertion since we know it's set at this point
}

export default dbConnect;
