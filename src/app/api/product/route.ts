import { NextRequest, NextResponse } from "next/server";
import productModel from "@/models/productSchema";
import { ImageModel } from "@/models/imageSchema";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import AuthModel from "@/models/authSchema";
import { CreatorModel } from "@/models/creatorSchema";
import ShaderModel from "@/models/shaderSchema";
import { UserModel } from "@/models/userSchema";
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
// - title: "Cool 3D Model"
// - description: "Amazing 3D model description"
// - category_id: ["categoryId123", "categoryId456"]
// - model_id: "modelId123"
// - shader: (file) shader-image.jpg
// - price_amount: "999"
// - price_currency: "INR"
// - image: (file) product-image.jpg

// Success Response (201):
// {
//     "success": true,
//     "message": "Product created successfully",
//     "data": {
//         "_id": "66f091a9b511458168a109ca",
//         "title": "Cool 3D Model",
//         "description": "Amazing 3D model description",
//         "category_id": [{
//             "_id": "66f091a9b511458168a109cb",
//             "name": "Category Name",
//             // ... other populated category fields
//         }],
//         "model_id": {
//             "_id": "66f091a9b511458168a109cc",
//             "name": "Model Name",
//             "modelUrl": "https://...",
//             // ... other populated model fields
//         },
//         "creator_id": {
//             "_id": "66f091a9b511458168a109cd",
//             "user_id": "66f091a9b511458168a109ce",
//             "name": "Creator Name",
//             // ... other populated creator fields
//         },
//         "shader_id": {
//             "_id": "66f091a9b511458168a109cf",
//             "user_id": "66f091a9b511458168a109cd",
//             "content_type": "image/jpeg",
//             "data": <Buffer ...>
//         },
//         "price": {
//             "amount": 999,
//             "currency": "INR"
//         },
//         "image_id": {
//             "_id": "66f091a9b511458168a109cg",
//             "user_id": "66f091a9b511458168a109cd",
//             "content_type": "image/jpeg",
//             "data": <Buffer ...>
//         },
//         "created_at": "2024-03-25T12:00:00.000Z",
//         "updated_at": "2024-03-25T12:00:00.000Z"
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
// Response:
// {
//     "success": true,
//     "data": {
//         "_id": "66f091a9b511458168a109ca",
//         "title": "Cool 3D Model",
//         "description": "Amazing 3D model description",
//         "category_id": [{
//             "_id": "66f091a9b511458168a109cb",
//             "name": "Category Name"
//         }],
//         "model_id": {
//             "_id": "66f091a9b511458168a109cc",
//             "name": "Model Name",
//             "modelUrl": "https://..."
//         },
//         "creator_id": {
//             "_id": "66f091a9b511458168a109cd",
//             "name": "Creator Name"
//         },
//         "shader_id": {
//             "_id": "66f091a9b511458168a109cf",
//             "content_type": "image/jpeg",
//             "data": <Buffer ...>
//         },
//         "image_id": {
//             "_id": "66f091a9b511458168a109cg",
//             "content_type": "image/jpeg",
//             "data": <Buffer ...>
//         },
//         "price": {
//             "amount": 999,
//             "currency": "INR"
//         }
//     }
// }

// 2. Get All Products (with pagination and filters)
// GET http://localhost:3000/api/product?page=1&limit=10&category=categoryId&creator=creatorId
// Response:
// {
//     "success": true,
//     "data": {
//         "products": [
//             // Array of populated product objects
//         ],
//         "pagination": {
//             "total": 100,
//             "page": 1,
//             "limit": 10,
//             "pages": 10
//         }
//     }
// }
