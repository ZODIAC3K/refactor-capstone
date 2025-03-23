import { NextRequest, NextResponse } from "next/server";
import { UserModel } from "@/models/userSchema";
import dbConnect from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { ImageModel } from "@/models/imageSchema";
import mongoose from "mongoose";
import { tokenModel } from "@/models/tokenSchema";
import jwt from "jsonwebtoken";
import { sendEmail } from "@/utils/utils";

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

			let newUser;

			// Handle profile picture if it exists
			if (profilePicture && profilePicture instanceof File) {
				// Create a new user document instance (not saved yet) to get an _id
				const userDoc = new UserModel(userData);

				// Now we have an _id we can use
				const userId = userDoc._id;

				// Convert the file to a buffer for storage
				const arrayBuffer = await profilePicture.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				// Create a new image document within the transaction
				const imageDoc = await ImageModel.create(
					[
						{
							user_id: userId, // Use the _id from the user document instance
							data: buffer,
							content_type: "profile_picture",
						},
					],
					{ session }
				);

				// Set the profile_picture field to reference the new image document
				userDoc.profile_picture = imageDoc[0]._id;

				// Now save the user document within the transaction, using the same _id
				newUser = await UserModel.create([userDoc.toObject()], {
					session,
				});
			} else {
				// If no profile picture, just create the user
				newUser = await UserModel.create([userData], { session });
			}

			userResponse = newUser[0].toObject();
			delete userResponse.password;

			// Create verification token while still in transaction
			const verificationToken = new tokenModel({
				userId: userResponse._id,
				token: jwt.sign(
					{ userId: userResponse._id },
					process.env.JWT_SECRET || "fallback_secret",
					{ expiresIn: "1h" }
				),
			});

			await verificationToken.save({ session }); // Save within the transaction

			// Create verification link
			const verificationLink = `${process.env.APP_URL}/verify/${userResponse._id}/${verificationToken.token}`;

			// Try to send email before committing transaction
			try {
				await sendEmail({
					email: userResponse.email,
					subject: "Email Verification",
					text: `Click the following link to verify your email: ${verificationLink}`,
					html: `<p>Click <a href="${verificationLink}">here</a> to verify your email</p>`,
				});

				// Only commit transaction if email is sent successfully
				await session.commitTransaction();
				console.log(
					"Transaction committed: User created and email sent"
				);
			} catch (emailError) {
				// If email fails, abort the transaction
				await session.abortTransaction();
				console.error("Failed to send verification email:", emailError);

				return NextResponse.json(
					{ error: "Failed to send verification email" },
					{ status: 500 }
				);
			}
		} catch (transactionError: any) {
			// If an error occurs, abort the transaction
			if (session.inTransaction()) {
				await session.abortTransaction();
			}
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
