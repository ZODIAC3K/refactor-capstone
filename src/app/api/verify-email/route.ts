import { NextRequest, NextResponse } from "next/server";
import { tokenModel } from "@/models/tokenSchema";
import { UserModel } from "@/models/userSchema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
	let session;

	try {
		// Connect to database
		const db = await dbConnect();
		if (!db) {
			throw new Error("Database connection failed");
		}

		// Parse request body
		let body;
		try {
			body = await request.json();
		} catch (parseError) {
			return NextResponse.json(
				{ error: "Invalid request body" },
				{ status: 400 }
			);
		}

		const { userid, token } = body;
		console.log(" === userid === ", userid);
		console.log(" === token === ", token);

		// Validate inputs
		if (!userid || !token) {
			return NextResponse.json(
				{ error: "Missing required fields: userid and token" },
				{ status: 400 }
			);
		}

		// Start a session for the transaction
		session = await mongoose.startSession();
		session.startTransaction();

		// Find user and update email verification status
		const userDoc = await UserModel.findOneAndUpdate(
			{ _id: userid },
			{ email_verification: true },
			{ session, new: true }
		);

		if (!userDoc) {
			throw new Error("User not found");
		}

		// Find token and update status
		const tokenDoc = await tokenModel.findOneAndUpdate(
			{
				token: token,
				userId: userid,
				description: "email-verification",
			},
			{ status: true },
			{ session, new: true }
		);
		if (!tokenDoc) {
			throw new Error("Invalid or expired token");
		}

		// Commit the transaction if both operations succeeded
		await session.commitTransaction();

		return NextResponse.json(
			{
				success: true,
				message: "Email verified successfully",
			},
			{ status: 200 }
		);
	} catch (error) {
		// Log the error for debugging
		console.error("Email verification error:", error);

		// Abort the transaction if it exists
		if (session) {
			try {
				await session.abortTransaction();
			} catch (abortError) {
				console.error("Error aborting transaction:", abortError);
			}
		}

		// Determine the error type and send appropriate response
		if (error instanceof Error) {
			// Handle specific error messages
			switch (error.message) {
				case "Database connection failed":
					return NextResponse.json(
						{ error: "Failed to connect to database" },
						{ status: 500 }
					);
				case "User not found":
					return NextResponse.json(
						{ error: "User not found" },
						{ status: 400 }
					);
				case "Invalid or expired token":
					return NextResponse.json(
						{ error: "Invalid or expired token" },
						{ status: 400 }
					);
				default:
					// For other error types with messages
					return NextResponse.json(
						{ error: error.message || "Something went wrong" },
						{ status: 500 }
					);
			}
		}

		// Default error response
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	} finally {
		// Always end the session if it exists
		if (session) {
			session.endSession();
		}
	}
}
