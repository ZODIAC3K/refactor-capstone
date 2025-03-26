import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import AuthModel from "@/models/authSchema";
import ReviewModel from "@/models/reviewSchema";
import productModel from "@/models/productSchema";
import { ImageModel } from "@/models/imageSchema";
import UserModel from "@/models/userSchema";

// POST: Create a new review
export async function POST(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			ReviewModel.findOne().exec(),
			AuthModel.findOne().exec(),
			productModel.findOne().exec(),
			ImageModel.findOne().exec(),
			UserModel.findOne().exec(),
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

			const auth = await AuthModel.findOne(
				{ accessToken, refreshToken },
				null,
				{ session }
			);

			if (!auth) {
				return NextResponse.json(
					{ success: false, error: "Invalid access token" },
					{ status: 401 }
				);
			}

			const formData = await request.formData();

			// Get review data
			const product_id = formData.get("product_id") as string;
			const message = formData.get("message") as string;
			const rating = Number(formData.get("rating"));
			const images = formData.getAll("images") as File[];

			// Validate required fields
			if (!product_id || !rating) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Product ID and rating are required",
					},
					{ status: 400 }
				);
			}

			// Validate rating
			if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Rating must be an integer between 1 and 5",
					},
					{ status: 400 }
				);
			}

			// Verify product exists
			const product = await productModel
				.findById(product_id)
				.session(session);
			if (!product) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Product not found" },
					{ status: 404 }
				);
			}

			// Check if user already reviewed this product
			const existingReview = await ReviewModel.findOne({
				product_id,
				user_id: auth.userId,
			}).session(session);

			if (existingReview) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "You have already reviewed this product",
					},
					{ status: 400 }
				);
			}

			// Upload images if provided
			const image_details_id = [];
			if (images.length > 0) {
				for (const image of images) {
					if (image.size > 0) {
						const imageBuffer = Buffer.from(
							await image.arrayBuffer()
						);
						const [imageDetail] = await ImageModel.create(
							[
								{
									user_id: auth.userId,
									data: imageBuffer,
									content_type: image.type,
								},
							],
							{ session }
						);
						image_details_id.push(imageDetail._id);
					}
				}
			}

			// Create review
			const [review] = await ReviewModel.create(
				[
					{
						product_id,
						user_id: auth.userId,
						message: message || "",
						rating,
						image_details_id,
					},
				],
				{ session }
			);

			// Update product rating (calculate average)
			const allReviews = await ReviewModel.find({ product_id }).session(
				session
			);
			const totalRating = allReviews.reduce(
				(sum, r) => sum + r.rating,
				0
			);
			const averageRating = totalRating / allReviews.length;

			await productModel.findByIdAndUpdate(
				product_id,
				{ rating: averageRating.toFixed(1) },
				{ session }
			);

			// Populate the review with related data
			const populatedReview = await ReviewModel.findById(review._id)
				.session(session)
				.populate([
					{
						path: "user_id",
						model: "UserDetail",
						select: "fname lname email profile_picture",
					},
					{ path: "image_details_id", model: "ImageDetail" },
				]);

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Review submitted successfully",
					data: populatedReview,
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
		console.error("Error creating review:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to submit review",
			},
			{ status: 500 }
		);
	}
}

// GET: Fetch reviews (by product, by user, or by ID)
export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			ReviewModel.findOne().exec(),
			UserModel.findOne().exec(),
			productModel.findOne().exec(),
			ImageModel.findOne().exec(),
		]).catch(() => {});

		// Get query params
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");
		const product_id = searchParams.get("product_id");
		const user_id = searchParams.get("user_id");
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");

		// Populate configuration
		const populateOptions = [
			{
				path: "user_id",
				model: "UserDetail",
				select: "fname lname email profile_picture",
			},
			{ path: "product_id", model: "Product", select: "title image_id" },
			{ path: "image_details_id", model: "ImageDetail" },
		];

		// Case 1: Get review by ID
		if (id) {
			const review =
				await ReviewModel.findById(id).populate(populateOptions);

			if (!review) {
				return NextResponse.json(
					{ success: false, error: "Review not found" },
					{ status: 404 }
				);
			}

			return NextResponse.json(
				{ success: true, data: review },
				{ status: 200 }
			);
		}

		// Build query based on parameters
		const query: any = {};
		if (product_id) query.product_id = product_id;
		if (user_id) query.user_id = user_id;

		// Get total count for pagination
		const total = await ReviewModel.countDocuments(query);

		// Get paginated results
		const reviews = await ReviewModel.find(query)
			.populate(populateOptions)
			.sort({ _id: -1 }) // Sort by newest first
			.skip((page - 1) * limit)
			.limit(limit);

		// Case 2: Get reviews for specific product
		if (product_id) {
			// Calculate overall stats for the product
			const allProductReviews = await ReviewModel.find({ product_id });
			const stats = {
				averageRating: 0,
				totalReviews: allProductReviews.length,
				ratingDistribution: {
					1: 0,
					2: 0,
					3: 0,
					4: 0,
					5: 0,
				},
			};

			if (allProductReviews.length > 0) {
				let totalRating = 0;
				allProductReviews.forEach((review) => {
					totalRating += review.rating;
					stats.ratingDistribution[
						review.rating as keyof typeof stats.ratingDistribution
					]++;
				});
				stats.averageRating = parseFloat(
					(totalRating / allProductReviews.length).toFixed(1)
				);
			}

			return NextResponse.json(
				{
					success: true,
					data: {
						reviews,
						stats,
						pagination: {
							total,
							page,
							limit,
							pages: Math.ceil(total / limit),
						},
					},
				},
				{ status: 200 }
			);
		}

		// Case 3: Get all reviews or user reviews
		return NextResponse.json(
			{
				success: true,
				data: {
					reviews,
					pagination: {
						total,
						page,
						limit,
						pages: Math.ceil(total / limit),
					},
				},
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error fetching reviews:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch reviews",
			},
			{ status: 500 }
		);
	}
}

// PATCH: Update an existing review
export async function PATCH(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			ReviewModel.findOne().exec(),
			AuthModel.findOne().exec(),
			productModel.findOne().exec(),
			ImageModel.findOne().exec(),
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

			const auth = await AuthModel.findOne(
				{ accessToken, refreshToken },
				null,
				{ session }
			);

			if (!auth) {
				return NextResponse.json(
					{ success: false, error: "Invalid access token" },
					{ status: 401 }
				);
			}

			const formData = await request.formData();

			// Get review data
			const id = formData.get("id") as string;
			const message = formData.get("message") as string;
			const rating = formData.get("rating")
				? Number(formData.get("rating"))
				: undefined;
			const images = formData.getAll("images") as File[];
			const deleteImages = formData.get("deleteImages") as string;
			const deleteImagesArray = deleteImages
				? deleteImages.split(",")
				: [];

			if (!id) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Review ID is required" },
					{ status: 400 }
				);
			}

			// Find the review
			const review = await ReviewModel.findById(id).session(session);

			if (!review) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Review not found" },
					{ status: 404 }
				);
			}

			// Ensure user owns the review
			if (review.user_id.toString() !== auth.userId.toString()) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to update this review",
					},
					{ status: 403 }
				);
			}

			// Validate rating if provided
			if (rating !== undefined) {
				if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{
							success: false,
							error: "Rating must be an integer between 1 and 5",
						},
						{ status: 400 }
					);
				}
			}

			// Handle image deletions
			if (deleteImagesArray.length > 0) {
				// Remove the image IDs from the review
				await ReviewModel.findByIdAndUpdate(
					id,
					{ $pull: { image_details_id: { $in: deleteImagesArray } } },
					{ session }
				);

				// Delete the images
				for (const imageId of deleteImagesArray) {
					await ImageModel.findByIdAndDelete(imageId, { session });
				}
			}

			// Upload new images if provided
			const newImageIds = [];
			if (images.length > 0) {
				for (const image of images) {
					if (image.size > 0) {
						const imageBuffer = Buffer.from(
							await image.arrayBuffer()
						);
						const [imageDetail] = await ImageModel.create(
							[
								{
									user_id: auth.userId,
									data: imageBuffer,
									content_type: image.type,
								},
							],
							{ session }
						);
						newImageIds.push(imageDetail._id);
					}
				}
			}

			// Update the review
			const updateData: any = {};
			if (message !== undefined) updateData.message = message;
			if (rating !== undefined) updateData.rating = rating;
			if (newImageIds.length > 0) {
				updateData.$push = { image_details_id: { $each: newImageIds } };
			}

			const updatedReview = await ReviewModel.findByIdAndUpdate(
				id,
				updateData,
				{ new: true, session }
			).populate([
				{
					path: "user_id",
					model: "UserDetail",
					select: "fname lname email profile_picture",
				},
				{ path: "image_details_id", model: "ImageDetail" },
			]);

			// Update product rating if rating was changed
			if (rating !== undefined) {
				const product_id = review.product_id;
				const allReviews = await ReviewModel.find({
					product_id,
				}).session(session);
				const totalRating = allReviews.reduce(
					(sum, r) => sum + r.rating,
					0
				);
				const averageRating = totalRating / allReviews.length;

				await productModel.findByIdAndUpdate(
					product_id,
					{ rating: averageRating.toFixed(1) },
					{ session }
				);
			}

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Review updated successfully",
					data: updatedReview,
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
		console.error("Error updating review:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to update review",
			},
			{ status: 500 }
		);
	}
}

// DELETE: Remove a review
export async function DELETE(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			ReviewModel.findOne().exec(),
			AuthModel.findOne().exec(),
			productModel.findOne().exec(),
			ImageModel.findOne().exec(),
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

			const auth = await AuthModel.findOne(
				{ accessToken, refreshToken },
				null,
				{ session }
			);

			if (!auth) {
				return NextResponse.json(
					{ success: false, error: "Invalid access token" },
					{ status: 401 }
				);
			}

			// Get review ID from query params
			const { searchParams } = new URL(request.url);
			const id = searchParams.get("id");

			if (!id) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Review ID is required" },
					{ status: 400 }
				);
			}

			// Find the review
			const review = await ReviewModel.findById(id).session(session);

			if (!review) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Review not found" },
					{ status: 404 }
				);
			}

			// Ensure user owns the review
			if (review.user_id.toString() !== auth.userId.toString()) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to delete this review",
					},
					{ status: 403 }
				);
			}

			// Store product ID for rating update
			const product_id = review.product_id;

			// Delete associated images
			if (review.image_details_id && review.image_details_id.length > 0) {
				for (const imageId of review.image_details_id) {
					await ImageModel.findByIdAndDelete(imageId, { session });
				}
			}

			// Delete the review
			await ReviewModel.findByIdAndDelete(id, { session });

			// Update product rating
			const remainingReviews = await ReviewModel.find({
				product_id,
			}).session(session);

			if (remainingReviews.length > 0) {
				const totalRating = remainingReviews.reduce(
					(sum, r) => sum + r.rating,
					0
				);
				const averageRating = totalRating / remainingReviews.length;

				await productModel.findByIdAndUpdate(
					product_id,
					{ rating: averageRating.toFixed(1) },
					{ session }
				);
			} else {
				// No reviews left, reset rating to 0
				await productModel.findByIdAndUpdate(
					product_id,
					{ rating: 0 },
					{ session }
				);
			}

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Review deleted successfully",
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
		console.error("Error deleting review:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to delete review",
			},
			{ status: 500 }
		);
	}
}

// ===== Example Requests and Responses =====

// 1. POST: Create a new review
// POST http://localhost:3000/api/review
// FormData:
// - product_id: "67e34283d001c2fc0ec7110d"
// - message: "Great product, high quality materials!"
// - rating: 5
// - images: (file1, file2) // Optional

// Success Response (201):
// {
//     "success": true,
//     "message": "Review submitted successfully",
//     "data": {
//         "_id": "67e34283d001c2fc0ec7111f",
//         "product_id": "67e34283d001c2fc0ec7110d",
//         "user_id": {
//             "_id": "67e34283d001c2fc0ec7110c",
//             "fname": "John",
//             "lname": "Doe",
//             "email": "john@example.com",
//             "profile_picture": "67e34283d001c2fc0ec71120"
//         },
//         "message": "Great product, high quality materials!",
//         "rating": 5,
//         "image_details_id": [
//             {
//                 "_id": "67e34283d001c2fc0ec71121",
//                 "data": "<Buffer ...>",
//                 "content_type": "image/jpeg"
//             },
//             {
//                 "_id": "67e34283d001c2fc0ec71122",
//                 "data": "<Buffer ...>",
//                 "content_type": "image/jpeg"
//             }
//         ]
//     }
// }

// 2.
// Fetch reviews for a product with pagination and sorting options by product id (review details of a specific product)
// GET http://localhost:3000/api/review?product_id=67e34283d001c2fc0ec7110d&page=1&limit=10

// OR
// Fetch reviews for a product with pagination and sorting options by review id (review details of a specific review)
// GET http://localhost:3000/api/review?id=67e34283d001c2fc0ec7110d&page=1&limit=10

// OR
// Fetch reviews for a product with pagination and sorting options by user id (review details of a specific user for all products)
// GET http://localhost:3000/api/review?user_id=67e34283d001c2fc0ec7110c&page=1&limit=10

// Success Response (200):
// {
//     "success": true,
//     "data": {
//         "reviews": [
//             {
//                 "_id": "67e34283d001c2fc0ec7111f",
//                 "product_id": {
//                     "_id": "67e34283d001c2fc0ec7110d",
//                     "title": "Product Name"
//                 },
//                 "user_id": {
//                     "_id": "67e34283d001c2fc0ec7110c",
//                     "fname": "John",
//                     "lname": "Doe"
//                 },
//                 "message": "Great product, high quality materials!",
//                 "rating": 5,
//                 "image_details_id": [...]
//             }
//         ],
//         "stats": {
//             "averageRating": 4.5,
//             "totalReviews": 2,
//             "ratingDistribution": {
//                 "1": 0,
//                 "2": 0,
//                 "3": 0,
//                 "4": 1,
//                 "5": 1
//             }
//         },
//         "pagination": {
//             "total": 2,
//             "page": 1,
//             "limit": 10,
//             "pages": 1
//         }
//     }
// }

// 3. GET: Fetch a specific review
// GET http://localhost:3000/api/review?id=67e34283d001c2fc0ec7111f

// Success Response (200):
// {
//     "success": true,
//     "data": {
//         "_id": "67e34283d001c2fc0ec7111f",
//         "product_id": {
//             "_id": "67e34283d001c2fc0ec7110d",
//             "title": "Product Name"
//         },
//         "user_id": {
//             "_id": "67e34283d001c2fc0ec7110c",
//             "fname": "John",
//             "lname": "Doe"
//         },
//         "message": "Great product, high quality materials!",
//         "rating": 5,
//         "image_details_id": [
//             {
//                 "_id": "67e34283d001c2fc0ec71121",
//                 "data": "<Buffer ...>",
//                 "content_type": "image/jpeg"
//             }
//         ]
//     }
// }

// 4. PATCH: Update a review
// PATCH http://localhost:3000/api/review
// FormData:
// - id: "67e34283d001c2fc0ec7111f"
// - message: "Updated review message"
// - rating: 4
// - images: (new_file) // Optional new images
// - deleteImages: "67e34283d001c2fc0ec71121,67e34283d001c2fc0ec71122" // Optional IDs to delete

// Success Response (200):
// {
//     "success": true,
//     "message": "Review updated successfully",
//     "data": {
//         "_id": "67e34283d001c2fc0ec7111f",
//         "message": "Updated review message",
//         "rating": 4,
//         "image_details_id": [
//             {
//                 "_id": "67e34283d001c2fc0ec71123",
//                 "data": "<Buffer ...>",
//                 "content_type": "image/jpeg"
//             }
//         ],
//         "user_id": {
//             "_id": "67e34283d001c2fc0ec7110c",
//             "fname": "John",
//             "lname": "Doe"
//         }
//     }
// }

// 5. DELETE: Remove a review
// DELETE http://localhost:3000/api/review?id=67e34283d001c2fc0ec7111f

// Success Response (200):
// {
//     "success": true,
//     "message": "Review deleted successfully"
// }
