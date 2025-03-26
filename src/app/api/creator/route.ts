import dbConnect from "@/lib/mongodb";
import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import AuthModel from "@/models/authSchema";
import { CreatorModel } from "@/models/creatorSchema";
import { ImageModel } from "@/models/imageSchema";
import UserModel from "@/models/userSchema";
import productModel from "@/models/productSchema";
import ShaderModel from "@/models/shaderSchema";

// TODO: uncomment the populate fields in the (get) and (patch) routes for the creator profile picture and cover image

export async function POST(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			// Pre-register all required models
			UserModel.findOne().exec(),
			ImageModel.findOne().exec(),
			CreatorModel.findOne().exec(),
			productModel.findOne().exec(),
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

export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			// Pre-register all required models
			UserModel.findOne().exec(),
			ImageModel.findOne().exec(),
			CreatorModel.findOne().exec(),
			productModel.findOne().exec(),
		]).catch(() => {}); // Ignore any "no documents found" errors

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const { searchParams } = new URL(request.url);
			const creatorId = searchParams.get("id");

			// If creator ID is provided, fetch that specific creator
			if (creatorId) {
				const creator = await CreatorModel.findById(creatorId)
					.session(session)
					.populate([
						{
							path: "userId",
							model: "UserDetail",
							select: "-password", // Exclude sensitive data
						},
						{
							path: "creatorProfilePicture",
							model: "ImageDetail",
						},
						{
							path: "creatorCoverImage",
							model: "ImageDetail",
						},
						{
							path: "products",
							model: "Product",
							populate: [
								{
									path: "image_id",
									model: "ImageDetail",
								},
							],
						},
					]);

				if (!creator) {
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{ success: false, error: "Creator not found" },
						{ status: 404 }
					);
				}

				await session.commitTransaction();
				session.endSession();

				return NextResponse.json(
					{
						success: true,
						message: "Creator profile fetched successfully",
						data: creator,
					},
					{ status: 200 }
				);
			}

			// If no ID provided, fetch authenticated user's creator profile
			const accessToken = request.cookies.get("accessToken")?.value;
			const refreshToken = request.cookies.get("refreshToken")?.value;

			const authUser = await AuthModel.findOne(
				{ accessToken, refreshToken },
				null,
				{ session }
			);

			if (!authUser) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Invalid access token" },
					{ status: 401 }
				);
			}

			const creator = await CreatorModel.findOne(
				{ userId: authUser.userId },
				null,
				{ session }
			).populate([
				{
					path: "userId",
					model: "UserDetail",
					select: "-password", // Exclude sensitive data
				},
				// {
				// 	path: "creatorProfilePicture",
				// 	model: "ImageDetail",
				// },
				// {
				// 	path: "creatorCoverImage",
				// 	model: "ImageDetail",
				// },
				// {
				// 	path: "products",
				// 	model: "Product",
				// },
			]);

			if (!creator) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Creator not found" },
					{ status: 404 }
				);
			}

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Creator profile fetched successfully",
					data: creator,
				},
				{ status: 200 }
			);
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error) {
		console.error("Error fetching creator:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "An unknown error occurred",
			},
			{ status: 500 }
		);
	}
}

// === Example Response ===
// Success Response (200):
// {
//     "success": true,
//     "message": "Creator profile fetched successfully",
//     "data": {
//         "_id": "65f091a9b511458168a109ca",
//         "userId": {
//             "_id": "65f091a9b511458168a109cb",
//             "email": "creator@example.com",
//             "fname": "John",
//             "lname": "Doe",
//             "mobile": "1234567890",
//             "email_verification": true,
//             "profile_picture": "65f091a9b511458168a109cc",
//             "created_at": "2024-03-12T10:00:00.000Z",
//             "modified_at": "2024-03-12T10:00:00.000Z"
//         },
//         "name": "Creator Name",
//         "bio": "A passionate 3D artist creating unique digital experiences",
//         "quote": "Art is the expression of the soul",
//         "creatorProfilePicture": {
//             "_id": "65f091a9b511458168a109cc",
//             "user_id": "65f091a9b511458168a109cb",
//             "data": "<Buffer ...>",
//             "content_type": "image/jpeg"
//         },
//         "creatorCoverImage": {
//             "_id": "65f091a9b511458168a109cd",
//             "user_id": "65f091a9b511458168a109cb",
//             "data": "<Buffer ...>",
//             "content_type": "image/jpeg"
//         },
//         "products": [
//             {
//                 "_id": "65f091a9b511458168a109ce",
//                 "title": "Cool 3D Model",
//                 "description": "Amazing 3D model description",
//                 "category_id": ["65f091a9b511458168a109cf"],
//                 "model_id": "65f091a9b511458168a109d0",
//                 "creator_id": "65f091a9b511458168a109ca",
//                 "shader_id": "65f091a9b511458168a109d1",
//                 "price": {
//                     "amount": 999,
//                     "currency": "INR"
//                 },
//                 "image_id": {
//                     "_id": "65f091a9b511458168a109d2",
//                     "user_id": "65f091a9b511458168a109cb",
//                     "data": "<Buffer ...>",
//                     "content_type": "image/jpeg"
//                 },
//                 "sales_count": 0,
//                 "created_at": "2024-03-12T10:00:00.000Z",
//                 "updated_at": "2024-03-12T10:00:00.000Z"
//             }
//         ],
//         "totalSales": 0,
//         "royaltyPercentage": 30,
//         "createdAt": "2024-03-12T10:00:00.000Z",
//         "updatedAt": "2024-03-12T10:00:00.000Z"
//     }
// }

export async function PATCH(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			UserModel.findOne().exec(),
			ImageModel.findOne().exec(),
			CreatorModel.findOne().exec(),
		]).catch(() => {});

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

			// First find the auth user to get userId
			const authUser = await AuthModel.findOne(
				{ accessToken, refreshToken },
				null,
				{ session }
			);

			if (!authUser) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Invalid access token" },
					{ status: 401 }
				);
			}

			// Find the creator using userId from auth
			const existingCreator = await CreatorModel.findOne(
				{ userId: authUser.userId },
				null,
				{ session }
			);

			if (!existingCreator) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Creator profile not found" },
					{ status: 404 }
				);
			}

			const formData = await request.formData();

			// Get fields to update
			const name = formData.get("name") as string;
			const bio = formData.get("bio") as string;
			const quote = formData.get("quote") as string;
			const profileImage = formData.get(
				"creatorProfileImage"
			) as File | null;
			const coverImage = formData.get("creatorCoverImage") as File | null;

			// Check name uniqueness only if name is being updated
			if (name && name !== existingCreator.name) {
				const nameExists = await CreatorModel.findOne({
					name,
					_id: { $ne: existingCreator._id }, // Exclude current creator
				});
				if (nameExists) {
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{ success: false, error: "Name already exists" },
						{ status: 400 }
					);
				}
			}

			// Handle profile image update if provided
			let profileImageId = existingCreator.creatorProfilePicture;
			if (profileImage) {
				// Delete existing profile image if it exists
				if (existingCreator.creatorProfilePicture) {
					await ImageModel.findByIdAndDelete(
						existingCreator.creatorProfilePicture,
						{ session }
					);
				}

				// Create new profile image
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

			// Handle cover image update if provided
			let coverImageId = existingCreator.creatorCoverImage;
			if (coverImage) {
				// Delete existing cover image if it exists
				if (existingCreator.creatorCoverImage) {
					await ImageModel.findByIdAndDelete(
						existingCreator.creatorCoverImage,
						{ session }
					);
				}

				// Create new cover image
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

			// Update only the provided fields
			const updateFields: any = {};
			if (name) updateFields.name = name;
			if (bio !== undefined) updateFields.bio = bio;
			if (quote !== undefined) updateFields.quote = quote;
			if (profileImageId)
				updateFields.creatorProfilePicture = profileImageId;
			if (coverImageId) updateFields.creatorCoverImage = coverImageId;

			// Update creator with only changed fields
			const updatedCreator = await CreatorModel.findByIdAndUpdate(
				existingCreator._id,
				{ $set: updateFields },
				{ new: true, session }
			).populate([
				{
					path: "userId",
					model: "UserDetail",
					select: "-password",
				},
				// {
				// 	path: "creatorProfilePicture",
				// 	model: "ImageDetail",
				// },
				// {
				// 	path: "creatorCoverImage",
				// 	model: "ImageDetail",
				// },
				{
					path: "products",
					model: "Product",
					// populate: {
					// 	path: "image_id",
					// 	model: "ImageDetail",
					// },
				},
			]);

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Creator profile updated successfully",
					data: updatedCreator,
				},
				{ status: 200 }
			);
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error) {
		console.error("Error updating creator:", error);
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
formData.append("name", "New Creator Name");

// Optional fields
formData.append("bio", "Updated bio content");
formData.append("quote", "Updated quote");

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
		method: "PATCH",
		body: formData,
		credentials: "include" // for cookies
	});

	const data = await response.json();
	
	if (!data.success) {
		throw new Error(data.error);
	}

	console.log("Creator profile updated:", data.data);
} catch (error) {
	console.error("Error updating creator profile:", error);
}
*/

// === Example Response ===
// Success Response (200):
// {
//     "success": true,
//     "message": "Creator profile updated successfully",
//     "data": {
//         "name": "New Creator Name",
//         "bio": "Updated bio content",
//         "quote": "Updated quote",
//         "creatorProfilePicture": {
//             "_id": "65f091a9b511458168a109cc",
//             "user_id": "65f091a9b511458168a109cb",
//             "data": "<Buffer ...>",
//             "content_type": "image/jpeg"
//         },
//          // user populated fields
//         "userId": {
//             "_id": "65f091a9b511458168a109cb",
//             "email": "creator@example.com",
//             "fname": "John",
//             "lname": "Doe",
//             "mobile": "1234567890",
//             "email_verification": true,
//         },
//          // creator cover image populated fields
//         "creatorCoverImage": {
//             "_id": "65f091a9b511458168a109cd",
//             "user_id": "65f091a9b511458168a109cb",
//             "data": "<Buffer ...>",
//             "content_type": "image/jpeg"
//         },
//         // products populated fields
//         "products": [
//             {
//                 "_id": "65f091a9b511458168a109ce",
//                 "title": "Cool 3D Model",
//                 "description": "Amazing 3D model description",
//                 "category_id": ["65f091a9b511458168a109cf"],
//                 "model_id": "65f091a9b511458168a109d0",
//                 "creator_id": "65f091a9b511458168a109ca",
//                 "shader_id": "65f091a9b511458168a109d1",
//                 "price": {
//                     "amount": 999,
//                     "currency": "INR"
//                 },
//                 "image_id": {
//                     "_id": "65f091a9b511458168a109d2",
//                     "user_id": "65f091a9b511458168a109cb",
//                     "data": "<Buffer ...>",
//                     "content_type": "image/jpeg"
//                 },
//                 "sales_count": 0,
//                 "created_at": "2024-03-12T10:00:00.000Z",
//                 "updated_at": "2024-03-12T10:00:00.000Z"
//             }
//         ],
//         "totalSales": 0,
//         "royaltyPercentage": 30,
//         "createdAt": "2024-03-12T10:00:00.000Z",
//         "updatedAt": "2024-03-12T10:00:00.000Z"
//     }
// }

export async function DELETE(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			UserModel.findOne().exec(),
			ImageModel.findOne().exec(),
			CreatorModel.findOne().exec(),
			productModel.findOne().exec(),
			ShaderModel.findOne().exec(),
		]).catch(() => {});

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

			const creator = await CreatorModel.findOne(
				{ userId: authUser.userId },
				null,
				{ session }
			);

			if (!creator) {
				return NextResponse.json(
					{ success: false, error: "Creator profile not found" },
					{ status: 404 }
				);
			}

			// Delete profile and cover images if they exist
			if (creator.creatorProfilePicture) {
				await ImageModel.findByIdAndDelete(
					creator.creatorProfilePicture,
					{ session }
				);
			}

			if (creator.creatorCoverImage) {
				await ImageModel.findByIdAndDelete(creator.creatorCoverImage, {
					session,
				});
			}

			// Delete all products and their associated images and shaders
			for (const productId of creator.products) {
				const product = await productModel
					.findById(productId)
					.session(session);
				if (product) {
					// Delete product image
					if (product.image_id) {
						await ImageModel.findByIdAndDelete(product.image_id, {
							session,
						});
					}

					// Delete shader and its image
					if (product.shader_id) {
						const shader = await ShaderModel.findById(
							product.shader_id
						).session(session);
						if (shader && shader.shaderImage) {
							await ImageModel.findByIdAndDelete(
								shader.shaderImage,
								{ session }
							);
						}
						await ShaderModel.findByIdAndDelete(product.shader_id, {
							session,
						});
					}

					// Delete the product
					await productModel.findByIdAndDelete(productId, {
						session,
					});
				}
			}

			// Finally, delete the creator profile
			await CreatorModel.findByIdAndDelete(creator._id, { session });

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message:
						"Creator profile and all associated data deleted successfully",
				},
				{ status: 200 }
			);
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error) {
		console.error("Error deleting creator:", error);
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
