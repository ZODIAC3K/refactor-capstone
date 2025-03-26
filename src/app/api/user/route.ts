import { NextRequest, NextResponse } from "next/server";
import { UserModel } from "@/models/userSchema";
import dbConnect from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { ImageModel } from "@/models/imageSchema";
import mongoose from "mongoose";
import { tokenModel } from "@/models/tokenSchema";
import jwt from "jsonwebtoken";
import { sendEmail } from "@/lib/emailService";
import AuthModel from "@/models/authSchema";
import populateAllAttributes from "@/utils/populateData";

export async function POST(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}

		if (!process.env.SALT) {
			return NextResponse.json(
				{ error: "SALT is not defined" },
				{ status: 500 }
			);
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

		const hashedPassword = await bcrypt.hash(
			password,
			Number(process.env.SALT)
		);

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
					process.env.JWT_SECRET || "zodiac3k",
					{ expiresIn: "1h" }
				),
				description: "email-verification",
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

export async function GET(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}

		const accessToken = request.cookies.get("accessToken")?.value;
		const refreshToken = request.cookies.get("refreshToken")?.value;

		if (!accessToken && !refreshToken) {
			return NextResponse.json(
				{ error: "No access token provided" },
				{ status: 401 }
			);
		}

		const session = await db.startSession();
		session.startTransaction();

		try {
			// Find auth record
			const auth = await AuthModel.findOne({
				accessToken,
				refreshToken,
			}).session(session);

			if (!auth) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Invalid token" },
					{ status: 401 }
				);
			}

			// Find user and populate all references
			let user = await UserModel.findById(auth.userId)
				.select("-password")
				.populate("savedAddress")
				.session(session);

			if (!user) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "User not found" },
					{ status: 404 }
				);
			}

			await session.commitTransaction();

			return NextResponse.json(user, { status: 200 });
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error: any) {
		console.error("Error fetching user:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch user" },
			{ status: 500 }
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}

		const session = await db.startSession();
		session.startTransaction();

		try {
			const accessToken = request.cookies.get("accessToken")?.value;
			const refreshToken = request.cookies.get("refreshToken")?.value;

			if (!accessToken && !refreshToken) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "No access token provided" },
					{ status: 401 }
				);
			}

			const auth = await AuthModel.findOne({
				accessToken,
				refreshToken,
			}).session(session);

			if (!auth) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Invalid token" },
					{ status: 401 }
				);
			}

			const user = await UserModel.findById(auth.userId).session(session);

			if (!user) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "User not found" },
					{ status: 404 }
				);
			}

			const formData = await request.formData();
			const updates: any = {};

			// Handle basic fields
			if (formData.has("fname")) updates.fname = formData.get("fname");
			if (formData.has("lname")) updates.lname = formData.get("lname");
			if (formData.has("phone")) updates.phone = formData.get("phone");

			// Handle password update
			if (
				formData.has("currentPassword") &&
				formData.has("newPassword")
			) {
				const currentPassword = formData.get(
					"currentPassword"
				) as string;
				const newPassword = formData.get("newPassword") as string;

				const isPasswordValid = await bcrypt.compare(
					currentPassword,
					user.password
				);
				if (!isPasswordValid) {
					await session.abortTransaction();
					return NextResponse.json(
						{ error: "Current password is incorrect" },
						{ status: 400 }
					);
				}

				if (newPassword.length < 8) {
					await session.abortTransaction();
					return NextResponse.json(
						{
							error: "New password must be at least 8 characters long",
						},
						{ status: 400 }
					);
				}
				const hashedPassword = await bcrypt.hash(
					newPassword,
					Number(process.env.SALT)
				);
				updates.password = hashedPassword;
			} else if (
				formData.has("newPassword") &&
				!formData.has("currentPassword")
			) {
				await session.abortTransaction();
				return NextResponse.json(
					{
						error: "Current password is required to update password",
					},
					{ status: 400 }
				);
			}

			// Update basic fields and password if provided
			if (Object.keys(updates).length > 0) {
				Object.assign(user, updates);
			}

			// Handle profile picture update
			if (formData.has("profile_picture")) {
				const profile_picture = formData.get("profile_picture") as File;

				if (profile_picture.size > 0) {
					// Add check to ensure valid file
					const bytes = await profile_picture.arrayBuffer();
					const buffer = Buffer.from(bytes);

					// Delete old profile picture if exists
					if (user.profile_picture) {
						await ImageModel.findByIdAndDelete(
							user.profile_picture
						).session(session);
					}

					// Create new image document
					const imageDoc = await ImageModel.create(
						[
							{
								user_id: user._id,
								data: buffer,
								content_type: "profile_picture",
							},
						],
						{ session }
					);

					user.profile_picture = imageDoc[0]._id;
				}
			}

			// Save user if there were any updates
			if (
				Object.keys(updates).length > 0 ||
				formData.has("profile_picture")
			) {
				await user.save({ session });
			}

			await session.commitTransaction();

			// Return updated user without sensitive information
			const updatedUser = user.toObject();
			delete updatedUser.password;

			return NextResponse.json(updatedUser, { status: 200 });
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error: any) {
		console.error("Error updating user:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to update user" },
			{ status: 500 }
		);
	}
}
// as number of collection is increasing, we need to add a new collection for the user details to make sure delete all the data related to the user
export async function DELETE(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}

		const session = await db.startSession();
		session.startTransaction();

		try {
			const accessToken = request.cookies.get("accessToken")?.value;
			const refreshToken = request.cookies.get("refreshToken")?.value;

			if (!accessToken && !refreshToken) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "No access token provided" },
					{ status: 401 }
				);
			}

			// Find auth record
			const auth = await AuthModel.findOne({
				accessToken,
				refreshToken,
			}).session(session);

			if (!auth) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Invalid token" },
					{ status: 401 }
				);
			}

			const userId = auth.userId;

			// Delete all user's images
			await ImageModel.deleteMany({ user_id: userId }).session(session);

			// Delete all auth records for this user
			await AuthModel.deleteMany({ userId }).session(session);

			// Delete user
			const deletedUser =
				await UserModel.findByIdAndDelete(userId).session(session);

			if (!deletedUser) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "User not found" },
					{ status: 404 }
				);
			}

			// Commit the transaction
			await session.commitTransaction();

			// Clear cookies
			const response = NextResponse.json(
				{ message: "User account deleted successfully" },
				{ status: 200 }
			);

			// Remove auth cookies
			response.cookies.delete("accessToken");
			response.cookies.delete("refreshToken");

			return response;
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error: any) {
		console.error("Error deleting user:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to delete user" },
			{ status: 500 }
		);
	}
}
