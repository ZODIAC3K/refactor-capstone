import { NextRequest, NextResponse } from "next/server";
import productModel from "@/models/productSchema";
import { ImageModel } from "@/models/imageSchema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import AuthModel from "@/models/authSchema";
import { CreatorModel } from "@/models/creatorSchema";
import ShaderModel from "@/models/shaderSchema";
import UserModel from "@/models/userSchema";
import CategoryModel from "@/models/categorySchema";
import objectModel from "@/models/objectSchema";

export async function POST(request: NextRequest) {
	try {
		await dbConnect();

		// Pre-register all required models
		await Promise.all([
			UserModel.findOne().exec(),
			ImageModel.findOne().exec(),
			CreatorModel.findOne().exec(),
			ShaderModel.findOne().exec(),
			CategoryModel.findOne().exec(),
			productModel.findOne().exec(),
			objectModel.findOne().exec(),
		]).catch(() => {});

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Authentication check
			const accessToken = request.cookies.get("accessToken")?.value;
			const refreshToken = request.cookies.get("refreshToken")?.value;

			if (!accessToken || !refreshToken) {
				return NextResponse.json(
					{ error: "No access token provided" },
					{ status: 401 }
				);
			}

			// Find user within transaction
			const findUser = await AuthModel.findOne(
				{ accessToken, refreshToken },
				null,
				{ session }
			);

			if (!findUser) {
				return NextResponse.json(
					{ error: "Invalid access token" },
					{ status: 401 }
				);
			}

			// Find creator within transaction
			const findCreator = await CreatorModel.findOne(
				{ user_id: findUser.user_id },
				null,
				{ session }
			);

			if (!findCreator) {
				return NextResponse.json(
					{ error: "Creator not found" },
				{ status: 404 }
			);
		}

			const creator_id = findCreator._id;

			const formData = await request.formData();

			// Get all form fields
			const title = formData.get("title") as string;
			const description = formData.get("description") as string;
			const category_id = formData.get("category_id") as string;
			const model_id = formData.get("model_id") as string;
			const shader = formData.get("shader") as File;
			const price_amount = Number(formData.get("price_amount"));
			const price_currency = formData.get("price_currency") as string;
			const image = formData.get("image") as File;
			const shaderType = formData.get("shaderType") as string;

			// Validate required fields
			if (!title || !model_id || !shader || !price_amount || !image) {
				console.log("Missing fields check:");
				console.log("title:", !!title);
				console.log("model_id:", !!model_id);
				console.log("shader:", !!shader);
				console.log("price_amount:", !!price_amount);
				console.log("image:", !!image);

				await session.abortTransaction();
				session.endSession();
				return Response.json(
					{
						success: false,
						error: "Missing required fields",
						missing: {
							title: !title,
							model_id: !model_id,
							shader: !shader,
							price_amount: !price_amount,
							image: !image,
						},
					},
					{ status: 400 }
				);
			}

			const unique_product = await productModel.findOne({ title });
			if (unique_product) {
				await session.abortTransaction();
				session.endSession();
				return Response.json(
					{
						success: false,
						error: "Product already exists with this title",
					},
					{ status: 400 }
				);
			}

			// Create image detail with binary data
			const imageBuffer = Buffer.from(await image.arrayBuffer());
			const [imageDetail] = await ImageModel.create(
				[
					{
						user_id: creator_id,
						data: imageBuffer,
						content_type: image.type,
					},
				],
				{ session }
			);

			// Create shader image first
			const shaderImageBuffer = Buffer.from(await shader.arrayBuffer());
			const [shaderImageDetail] = await ImageModel.create(
				[
					{
						user_id: creator_id,
						data: shaderImageBuffer,
						content_type: shader.type,
					},
				],
				{ session }
			);

			// Create product first (without shader reference)
			const [product] = await productModel.create(
				[
					{
			title,
			description,
						category_id: category_id ? category_id.split(",") : [],
			model_id,
			creator_id,
						price: {
							amount: price_amount,
							currency: price_currency || "INR",
						},
						image_id: imageDetail._id,
					},
				],
				{ session }
			);

			// Now create shader with product reference
			const [shaderDetail] = await ShaderModel.create(
				[
					{
						user_id: creator_id,
						shaderImage: shaderImageDetail._id,
						shaderType: shaderType,
						product_id: product._id,
					},
				],
				{ session }
			);

			// Update product with shader reference
			await productModel.findByIdAndUpdate(
				product._id,
				{ shader_id: shaderDetail._id },
				{ session }
			);

			// Update creator products array
			const creator = await CreatorModel.findById(creator_id);
			creator?.products.push(product._id);
			await creator?.save({ session });

			// Populate all references within transaction
			const populatedProduct = await productModel
				.findById(product._id)
				.session(session)
				.populate([
					{
						path: "category_id",
						model: "categoryschema",
					},
					{ path: "model_id", model: "Object" },
					{ path: "creator_id", model: "Creator" },
					{ path: "shader_id", model: "shaderSchema" },
					// { path: "image_id", model: "ImageDetail" },
				]);

			// Commit the transaction
			await session.commitTransaction();
			session.endSession();

		return Response.json(
			{
				success: true,
				message: "Product created successfully",
					data: populatedProduct,
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
		console.error("Error creating product:", error);
		return Response.json(
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

// === Example FormData ===
// Request at: http://localhost:3000/api/product
// Method: POST
// Headers:
// - Cookie: accessToken=xxx; refreshToken=yyy

// FormData:
// - title: "Cool T-Shirt EEDFEF"
// - description: "Awesome T-Shirt"
// - category_id: "67e2c2efa9e1238a162f5a3c"
// - model_id: "67e34283d001c2fc0ec7110c"
// - shader: (file) 366278.jpg
// - price_amount: "999"
// - price_currency: "INR"
// - image: (file) ai_faishon.jpg
// - shaderType: "partial-body"

// Success Response (201):
// {
//     "success": true,
//     "message": "Product created successfully",
//     "data": {
//         "_id": "67e34283d001c2fc0ec7110d",
//         "title": "Cool T-Shirt EEDFEF",
//         "description": "Awesome T-Shirt",
//         "category_id": [{
//             "_id": "67e2c2efa9e1238a162f5a3c",
//             "category_name": "T-Shirts"
//         }],
//         "model_id": {
//             "_id": "67e34283d001c2fc0ec7110c",
//             "name": "T-Shirt Model",
//             "modelUrl": "https://zodiac3k-bucket.s3.amazonaws.com/models/t-shirt.glb",
//             "position": { "x": 0, "y": 0, "z": 0 },
//             "rotation": { "x": 0, "y": 0, "z": 0 },
//             "scale": { "x": 1, "y": 1, "z": 1 }
//         },
//         "creator_id": {
//             "_id": "67e34283d001c2fc0ec7110e",
//             "userId": "67e34283d001c2fc0ec7110f",
//             "name": "Creator Name",
//             "bio": "Creative designer",
//             "quote": "Design is life",
//             "royaltyPercentage": 30
//         },
//         "shader_id": {
//             "_id": "67e34283d001c2fc0ec71111",
//             "shaderType": "partial-body",
//             "shaderImage": "67e34283d001c2fc0ec71112",
//             "product_id": "67e34283d001c2fc0ec7110d",
//             "mapping": {
//                 "scale": { "x": 1, "y": 1 },
//                 "offset": { "x": 0, "y": 0 },
//                 "rotation": 0
//             }
//         },
//         "price": {
//             "amount": 999,
//             "currency": "INR"
//         },
//         "image_id": {
//             "_id": "67e34283d001c2fc0ec71113",
//             "user_id": "67e34283d001c2fc0ec7110e",
//             "content_type": "image/jpeg",
//             "data": "<Buffer ...>"
//         },
//         "sales_count": 0,
//         "created_at": "2024-03-12T10:00:00.000Z",
//         "updated_at": "2024-03-12T10:00:00.000Z"
//     }
// }

export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		// Populate configuration
		const populateOptions = [
			{
				path: "category_id",
				model: "categoryschema",
			},
			{
				path: "model_id",
				model: "Object",
			},
			{
				path: "creator_id",
				model: "Creator",
			},
			{
				path: "shader_id",
				model: "shaderSchema",
			},
		];

		if (id) {
			// Get single product
			const product = await productModel
				.findById(id)
				.populate(populateOptions);

			if (!product) {
				return NextResponse.json(
					{
						success: false,
						error: "No product found",
					},
					{ status: 404 }
				);
			}

			return NextResponse.json(
				{ success: true, data: product },
				{ status: 200 }
			);
		}

		// Get all products with optional filters
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const category = searchParams.get("category");
		const creator = searchParams.get("creator");

		// Build query
		const query: any = {};
		if (category) query.category_id = category;
		if (creator) query.creator_id = creator;

		// Get total count for pagination
		const total = await productModel.countDocuments(query);

		// Get paginated results
		const products = await productModel
			.find(query)
			.populate(populateOptions)
			.sort({ created_at: -1 })
			.skip((page - 1) * limit)
			.limit(limit);

		if (products.length === 0) {
			return NextResponse.json(
				{ success: false, error: "No products found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(
			{
				success: true,
				data: {
					products,
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
		console.error("Error fetching products:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch products",
			},
			{ status: 500 }
		);
	}
}

// === Example Requests and Responses ===

// 1. Get Single Product
// GET http://localhost:3000/api/product?id=66f091a9b511458168a109ca

// Success Response (200):
// {
//     "success": true,
//     "data": {
//         "_id": "66f091a9b511458168a109ca",
//         "title": "Cool T-Shirt EEDFEF",
//         "description": "Awesome T-Shirt",
//         "category_id": [{
//             "_id": "67e2c2efa9e1238a162f5a3c",
//             "category_name": "T-Shirts"
//         }],
//         "model_id": {
//             "_id": "67e34283d001c2fc0ec7110c",
//             "name": "T-Shirt Model",
//             "modelUrl": "https://zodiac3k-bucket.s3.amazonaws.com/models/t-shirt.glb",
//             "position": { "x": 0, "y": 0, "z": 0 },
//             "rotation": { "x": 0, "y": 0, "z": 0 },
//             "scale": { "x": 1, "y": 1, "z": 1 }
//         },
//         "creator_id": {
//             "_id": "67e34283d001c2fc0ec7110d",
//             "name": "Creator Name",
//             "bio": "Creative designer",
//             "quote": "Design is life"
//         },
//         "shader_id": {
//             "_id": "67e34283d001c2fc0ec7110e",
//             "shaderType": "partial-body",
//             "shaderImage": "67e34283d001c2fc0ec7110f",
//             "product_id": "66f091a9b511458168a109ca"
//         },
//         "image_id": {
//             "_id": "67e34283d001c2fc0ec71110",
//             "user_id": "67e34283d001c2fc0ec71111",
//             "content_type": "image/jpeg",
//             "data": "<Buffer ...>"
//         },
//         "price": {
//             "amount": 999,
//             "currency": "INR"
//         },
//         "sales_count": 0,
//         "created_at": "2024-03-12T10:00:00.000Z",
//         "updated_at": "2024-03-12T10:00:00.000Z"
//     }
// }

// 2. Get All Products (with pagination and filters)
// GET http://localhost:3000/api/product?page=1&limit=10&category=categoryId&creator=creatorId

// Success Response (200):
// {
//     "success": true,
//     "data": {
//         "products": [
//             {
//                 // Same structure as single product response
//                 "_id": "66f091a9b511458168a109ca",
//                 "title": "Cool T-Shirt EEDFEF",
//                 // ... other fields
//             }
//         ],
//         "pagination": {
//             "total": 100,
//             "page": 1,
//             "limit": 10,
//             "pages": 10
//         }
//     }
// }

export async function PATCH(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			UserModel.findOne().exec(),
			ImageModel.findOne().exec(),
			CreatorModel.findOne().exec(),
			ShaderModel.findOne().exec(),
			CategoryModel.findOne().exec(),
			productModel.findOne().exec(),
			objectModel.findOne().exec(),
		]).catch(() => {});

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			const formData = await request.formData();
			const productId = formData.get("productId") as string;

			if (!productId) {
				return NextResponse.json(
					{ success: false, error: "Product ID is required" },
					{ status: 400 }
				);
			}

			// First, find and validate the product
			const existingProduct = await productModel
				.findById(productId)
				.session(session);
			if (!existingProduct) {
				return NextResponse.json(
					{ success: false, error: "Product not found" },
					{ status: 404 }
				);
			}

			// Get update fields
			const title = formData.get("title") as string;
			const description = formData.get("description") as string;
			const category_id = formData.get("category_id") as string;
			const model_id = formData.get("model_id") as string;
			const price_amount = Number(formData.get("price_amount"));
			const price_currency = formData.get("price_currency") as string;
			const shader = formData.get("shader") as File;
			const image = formData.get("image") as File;
			const shaderType = formData.get("shaderType") as string;

			// Check title uniqueness if being updated
			if (title && title !== existingProduct.title) {
				const titleExists = await productModel
					.findOne({
						title,
						_id: { $ne: productId },
					})
					.session(session);

				if (titleExists) {
					return NextResponse.json(
						{
							success: false,
							error: "Product title already exists",
						},
						{ status: 400 }
					);
				}
			}

			// Prepare update fields
			const updateFields: any = {};
			if (title) updateFields.title = title;
			if (description) updateFields.description = description;
			if (category_id) updateFields.category_id = category_id.split(",");
			if (model_id) updateFields.model_id = model_id;
			if (price_amount)
				updateFields.price = {
					...existingProduct.price,
					amount: price_amount,
				};
			if (price_currency)
				updateFields.price = {
					...existingProduct.price,
					currency: price_currency,
				};

			// Handle image update if provided
			if (image) {
				// Create new image first
				const imageBuffer = Buffer.from(await image.arrayBuffer());
				const [imageDetail] = await ImageModel.create(
					[
						{
							user_id: existingProduct.creator_id,
							data: imageBuffer,
							content_type: image.type,
						},
					],
					{ session }
				);

				// Only after successful creation, delete the old image
				await ImageModel.findByIdAndDelete(existingProduct.image_id, {
					session,
				});
				updateFields.image_id = imageDetail._id;
			}

			// Handle shader update if provided
			if (shader) {
				// Create new shader image first
				const shaderImageBuffer = Buffer.from(
					await shader.arrayBuffer()
				);
				const [shaderImageDetail] = await ImageModel.create(
					[
						{
							user_id: existingProduct.creator_id,
							data: shaderImageBuffer,
							content_type: shader.type,
						},
					],
					{ session }
				);

				// Create new shader
				const [shaderDetail] = await ShaderModel.create(
					[
						{
							user_id: existingProduct.creator_id,
							shaderImage: shaderImageDetail._id,
							shaderType:
								shaderType ||
								existingProduct.shader_id.shaderType,
							product_id: productId,
						},
					],
					{ session }
				);

				// Only after successful creation, delete the old shader and its image
				const existingShader = await ShaderModel.findById(
					existingProduct.shader_id
				).session(session);
				if (existingShader) {
					await ImageModel.findByIdAndDelete(
						existingShader.shaderImage,
						{ session }
					);
					await ShaderModel.findByIdAndDelete(existingShader._id, {
						session,
					});
				}

				updateFields.shader_id = shaderDetail._id;
			}

			// Update product with all changes
			const updatedProduct = await productModel.findByIdAndUpdate(
				productId,
				{ $set: updateFields },
				{ new: true, session }
			);
			// .populate([
			// 	{ path: "category_id", model: "categoryschema" },
			// 	{ path: "model_id", model: "Object" },
			// 	{ path: "creator_id", model: "Creator" },
			// 	{ path: "shader_id", model: "shaderSchema" },
			// 	{ path: "image_id", model: "ImageDetail" },
			// ]);

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Product updated successfully",
					data: updatedProduct,
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
		console.error("Error updating product:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to update product",
			},
			{ status: 500 }
		);
	}
}

// === Example Requests and Responses ===

// PATCH Product
// Request at: http://localhost:3000/api/product
// Method: PATCH
// Headers:
// - Cookie: accessToken=xxx; refreshToken=yyy

// FormData:
// - productId: "67e34283d001c2fc0ec7110d" (required)
// - title: "Updated T-Shirt Name" (optional)
// - description: "Updated description" (optional)
// - category_id: "67e2c2efa9e1238a162f5a3c" (optional)
// - model_id: "67e34283d001c2fc0ec7110c" (optional)
// - shader: (file) new-shader.jpg (optional)
// - price_amount: "1999" (optional)
// - price_currency: "INR" (optional)
// - image: (file) new-product-image.jpg (optional)
// - shaderType: "partial-body" (optional, required if shader is provided)

// Success Response (200):
// {
//     "success": true,
//     "message": "Product updated successfully",
//     "data": {
//         "_id": "67e34283d001c2fc0ec7110d",
//         "title": "Updated T-Shirt Name",
//         "description": "Updated description",
//         "category_id": [{
//             "_id": "67e2c2efa9e1238a162f5a3c",
//             "category_name": "T-Shirts"
//         }],
//         "model_id": {
//             "_id": "67e34283d001c2fc0ec7110c",
//             "name": "T-Shirt Model",
//             "modelUrl": "https://zodiac3k-bucket.s3.amazonaws.com/models/t-shirt.glb",
//             "position": { "x": 0, "y": 0, "z": 0 },
//             "rotation": { "x": 0, "y": 0, "z": 0 },
//             "scale": { "x": 1, "y": 1, "z": 1 }
//         },
//         "creator_id": {
//             "_id": "67e34283d001c2fc0ec7110e",
//             "userId": "67e34283d001c2fc0ec7110f",
//             "name": "Creator Name",
//             "bio": "Creative designer",
//             "quote": "Design is life",
//             "royaltyPercentage": 30
//         },
//         "shader_id": {
//             "_id": "67e34283d001c2fc0ec71111",
//             "shaderType": "partial-body",
//             "shaderImage": "67e34283d001c2fc0ec71112",
//             "product_id": "67e34283d001c2fc0ec7110d",
//             "mapping": {
//                 "scale": { "x": 1, "y": 1 },
//                 "offset": { "x": 0, "y": 0 },
//                 "rotation": 0
//             }
//         },
//         "price": {
//             "amount": 1999,
//             "currency": "INR"
//         },
//         "image_id": {
//             "_id": "67e34283d001c2fc0ec71113",
//             "user_id": "67e34283d001c2fc0ec7110e",
//             "content_type": "image/jpeg",
//             "data": "<Buffer ...>"
//         },
//         "sales_count": 0,
//         "created_at": "2024-03-12T10:00:00.000Z",
//         "updated_at": "2024-03-12T10:30:00.000Z"
//     }
// }

// Error Response (400) - Missing ID:
// {
//     "success": false,
//     "error": "Product ID is required"
// }

// Error Response (404) - Product Not Found:
// {
//     "success": false,
//     "error": "Product not found"
// }

// Error Response (400) - Duplicate Title:
// {
//     "success": false,
//     "error": "Product title already exists"
// }

// Error Response (401) - Authentication:
// {
//     "success": false,
//     "error": "Invalid access token"
// }

// Error Response (500) - Server Error:
// {
//     "success": false,
//     "error": "Failed to update product"
// }

export async function DELETE(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			UserModel.findOne().exec(),
			ImageModel.findOne().exec(),
			CreatorModel.findOne().exec(),
			ShaderModel.findOne().exec(),
			productModel.findOne().exec(),
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

			// Get product ID from URL params
			const { searchParams } = new URL(request.url);
			const productId = searchParams.get("productId");

			if (!productId) {
				return NextResponse.json(
					{ success: false, error: "Product ID is required" },
					{ status: 400 }
				);
			}

			// Find the product
			const product = await productModel
				.findById(productId)
				.session(session);
			if (!product) {
				return NextResponse.json(
					{ success: false, error: "Product not found" },
					{ status: 404 }
				);
			}

			// Find creator to verify ownership
			const creator = await CreatorModel.findById(
				product.creator_id
			).session(session);
			if (
				!creator ||
				creator.userId.toString() !== authUser.userId.toString()
			) {
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to delete this product",
					},
					{ status: 403 }
				);
			}

			// Delete associated shader and its image
			if (product.shader_id) {
				const shader = await ShaderModel.findById(
					product.shader_id
				).session(session);
				if (shader) {
					// Delete shader image
					await ImageModel.findByIdAndDelete(shader.shaderImage, {
						session,
					});
					// Delete shader
					await ShaderModel.findByIdAndDelete(product.shader_id, {
						session,
					});
				}
			}

			// Delete product image
			if (product.image_id) {
				await ImageModel.findByIdAndDelete(product.image_id, {
					session,
				});
			}

			// Remove product from creator's products array
			await CreatorModel.findByIdAndUpdate(
				product.creator_id,
				{ $pull: { products: product._id } },
				{ session }
			);

			// Finally delete the product
			await productModel.findByIdAndDelete(productId, { session });

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message:
						"Product and associated resources deleted successfully",
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
		console.error("Error deleting product:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to delete product",
			},
			{ status: 500 }
		);
	}
}

// === Example Requests and Responses ===

// DELETE Product
// Request at: http://localhost:3000/api/product?productId=67e34283d001c2fc0ec7110d
// Method: DELETE
// Headers:
// - Cookie: accessToken=xxx; refreshToken=yyy

// Success Response (200):
// {
//     "success": true,
//     "message": "Product and associated resources deleted successfully"
// }
