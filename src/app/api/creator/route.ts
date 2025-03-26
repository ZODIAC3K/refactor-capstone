import dbConnect from "@/lib/mongodb";
import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import AuthModel from "@/models/authSchema";
import { CreatorModel } from "@/models/creatorSchema";
import { ImageModel } from "@/models/imageSchema";
import { UserModel } from "@/models/userSchema";

export async function POST(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			// Pre-register all required models
			UserModel.findOne().exec(),
			ImageModel.findOne().exec(),
			CreatorModel.findOne().exec(),
		]).catch(() => {}); // Ignore any "no documents found" errors

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Authentication check
			const accessToken = request.cookies.get("accessToken")?.value;
			const refreshToken = request.cookies.get("refreshToken")?.value;

			if (!accessToken || !refreshToken) {
				return NextResponse.json(
					{ success: false, error: "No access token provided" },
					{ status: 401 }
				);
			}

			// Find user within transaction
			const authUser = await AuthModel.findOne(
				{ accessToken, refreshToken },
				null,
				{ session }
			);

			if (!authUser) {
				return NextResponse.json(
					{ success: false, error: "Invalid access token" },
					{ status: 401 }
				);
			}

			const formData = await request.formData();

			// Get basic fields
			const name = formData.get("name") as string;
			const bio = formData.get("bio") as string;
			const quote = formData.get("quote") as string;

			// Get images
			const profileImage = formData.get(
				"creatorProfileImage"
			) as File | null;
			const coverImage = formData.get("creatorCoverImage") as File | null;

			// Validate required fields
			if (!name?.trim()) {
				return NextResponse.json(
					{ success: false, error: "Name is required" },
					{ status: 400 }
				);
			}

			const unique_name = await CreatorModel.findOne({ name });
			if (unique_name) {
				return NextResponse.json(
					{ success: false, error: "Name already exists" },
					{ status: 400 }
				);
			}

			// Handle profile image upload if provided
			let profileImageId = undefined;
			if (profileImage) {
				const imageBuffer = Buffer.from(
					await profileImage.arrayBuffer()
				);
				const [imageDetail] = await ImageModel.create(
					[
						{
							user_id: authUser.userId,
							data: imageBuffer,
							content_type: profileImage.type,
						},
					],
					{ session }
				);
				profileImageId = imageDetail._id;
			}

			// Handle cover image upload if provided
			let coverImageId = undefined;
			if (coverImage) {
				const imageBuffer = Buffer.from(await coverImage.arrayBuffer());
				const [imageDetail] = await ImageModel.create(
					[
						{
							user_id: authUser.userId,
							data: imageBuffer,
							content_type: coverImage.type,
						},
					],
					{ session }
				);
				coverImageId = imageDetail._id;
			}

			// Create creator
			const [creator] = await CreatorModel.create(
				[
					{
						userId: authUser.userId,
						name,
						bio: bio || "",
						quote: quote || "",
						creatorProfilePicture: profileImageId,
						creatorCoverImage: coverImageId,
						products: [],
						totalSales: 0,
						royaltyPercentage: 30,
					},
				],
				{ session }
			);

			// // Force schema registration by referencing UserModel
			// await UserModel.findById(authUser.userId).session(session);

			// Now populate
			const populatedCreator = await creator.populate([
				{ path: "userId" },
				// { path: "creatorProfilePicture" },
				// { path: "creatorCoverImage" },
			]);

			await session.commitTransaction();

			return NextResponse.json(
				{
					success: true,
					message: "Creator profile created successfully",
					data: populatedCreator,
				},
				{ status: 201 }
			);
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error) {
		console.error("Error creating creator:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Internal server error",
			},
			{ status: 500 }
		);
	}
}

// === Example FormData Usage ===
// Frontend code example:
/*
const formData = new FormData();

// Required field
formData.append("name", "Creator Name");

// Optional fields
formData.append("bio", "A passionate 3D artist creating unique digital experiences");
formData.append("quote", "Art is the expression of the soul");

// Profile Picture (optional)
// Assuming you have a file input or File object
const profilePicture: File = document.querySelector('input[type="file"]').files[0];
if (profilePicture) {
	formData.append("creatorProfileImage", profilePicture);
}

// Cover Image (optional)
const coverImage: File = document.querySelector('input[type="file"]').files[0];
if (coverImage) {
	formData.append("creatorCoverImage", coverImage);
}

// API call
try {
	const response = await fetch("/api/creator", {
		method: "POST",
		body: formData,
		credentials: "include" // for cookies
	});

	const data = await response.json();
	
	if (!data.success) {
		throw new Error(data.error);
	}

	console.log("Creator profile created:", data.data);
} catch (error) {
	console.error("Error creating creator profile:", error);
}
*/

// === Example Response ===
// Success Response (201):
// {
//     "success": true,
//     "message": "Creator profile created successfully",
//     "data": {
//         "_id": "65f091a9b511458168a109ca",
//         "userId": {
//             "_id": "65f091a9b511458168a109cb",
//             // ... populated user details
//         },
//         "name": "Creator Name",
//         "bio": "A passionate 3D artist creating unique digital experiences",
//         "quote": "Art is the expression of the soul",
//         "creatorProfilePicture": {
//             "_id": "65f091a9b511458168a109cc",
//             "user_id": "65f091a9b511458168a109cb",
//             "data": <Buffer ...>,
//             "content_type": "image/jpeg"
//         },
//         "creatorCoverImage": {
//             "_id": "65f091a9b511458168a109cd",
//             "user_id": "65f091a9b511458168a109cb",
//             "data": <Buffer ...>,
//             "content_type": "image/jpeg"
//         },
//         "products": [], // Will be populated with product references
//         "totalSales": 0,
//         "royaltyPercentage": 30,
//         "createdAt": "2024-03-25T12:00:00.000Z",
//         "updatedAt": "2024-03-25T12:00:00.000Z"
//     }
// }
