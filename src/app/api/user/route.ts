import { NextRequest, NextResponse } from "next/server";
import { UserModel } from "@/models/userSchema";
import dbConnect from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { ImageModel } from "@/models/imageSchema";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		} else {
			console.log("Connected to database");
		}

		// Handle multipart form data
		const formData = await request.formData();
		console.log("Form data received:", formData);

		// Extract data from form fields
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const fname = formData.get("fname") as string;
		const lname = formData.get("lname") as string;
		const mobile = formData.get("mobile") as string;

		// Get profile picture if it exists
		const profilePicture = formData.get("profile_picture") as File | null;

		// Validate required fields
		if (!email || !password || !fname || !lname || !mobile) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		const existingUser = await UserModel.findOne({ email });
		if (existingUser) {
			return NextResponse.json(
				{ error: "User with this email already exists" },
				{ status: 409 }
			);
		}

		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user data object
		const userData: any = {
			email,
			password: hashedPassword,
			fname,
			lname,
			mobile,
		};

		// Start a MongoDB session for the transaction
		const session = await mongoose.startSession();
		let userResponse;

		try {
			// Start the transaction
			session.startTransaction();

			// Handle profile picture if it exists
			if (profilePicture && profilePicture instanceof File) {
				// Convert the file to a buffer for storage
				const arrayBuffer = await profilePicture.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				// Create a new image document within the transaction
				const imageDoc = await ImageModel.create(
					[
						{
							user_id: userData._id,
							data: buffer,
							content_type: "profile_picture",
						},
					],
					{ session }
				);
				// Set the profile_picture field to reference the new image document
				userData.profile_picture = imageDoc[0]._id;
			}

			// Create the user document within the same transaction
			const newUser = await UserModel.create([userData], { session });

			// Commit the transaction
			await session.commitTransaction();

			userResponse = newUser[0].toObject();
			delete userResponse.password;
		} catch (transactionError: any) {
			// If an error occurs, abort the transaction
			await session.abortTransaction();
			console.error("Transaction error:", transactionError);

			return NextResponse.json(
				{ error: transactionError.message || "Transaction failed" },
				{ status: 500 }
			);
		} finally {
			// End the session
			await session.endSession();
		}

		return NextResponse.json(
			{
				message: "User registered successfully",
				user: userResponse,
			},
			{ status: 201 }
		);
	} catch (error: any) {
		console.error("Registration error:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to register user" },
			{ status: 500 }
		);
	}
}
