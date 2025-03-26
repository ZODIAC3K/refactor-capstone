import orderModel from "@/models/orderSchema";
import AuthModel from "@/models/authSchema";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import UserModel from "@/models/userSchema";
import productModel from "@/models/productSchema";
import couponModel from "@/models/couponSchema";
import offerModel from "@/models/offerSchema";
import { AddressModel } from "@/models/addressSchema";
import { CreatorModel } from "@/models/creatorSchema";
// create order
export async function POST(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			UserModel.findOne().exec(),
			orderModel.findOne().exec(),
			AuthModel.findOne().exec(),
			productModel.findOne().exec(),
			couponModel.findOne().exec(),
			offerModel.findOne().exec(),
			AddressModel.findOne().exec(),
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

			const {
				product_ordered,
				size_ordered,
				quantity_ordered,
				coupon_used,
				offer_used,
				address_id,
				transcation_id,
			} = await request.json();

			if (!transcation_id) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Transaction ID is required" },
					{ status: 400 }
				);
			}
			// Validate required fields
			if (
				!product_ordered?.length ||
				!size_ordered?.length ||
				!quantity_ordered?.length
			) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Product, size, and quantity details are required",
					},
					{ status: 400 }
				);
			}

			// Validate arrays have same length
			if (
				product_ordered.length !== size_ordered.length ||
				product_ordered.length !== quantity_ordered.length
			) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Product, size, and quantity arrays must have same length",
					},
					{ status: 400 }
				);
			}

			// Verify all products exist
			for (const productId of product_ordered) {
				const product = await productModel
					.findById(productId)
					.session(session);
				if (!product) {
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{
							success: false,
							error: `Product not found: ${productId}`,
						},
						{ status: 404 }
					);
				}
			}

			// Calculate total amount first
			let total_amount = 0;
			for (let i = 0; i < product_ordered.length; i++) {
				const product = await productModel
					.findById(product_ordered[i])
					.session(session);
				total_amount += product.price.amount * quantity_ordered[i];
			}

			// Set initial amount_paid equal to total_amount
			let amount_paid = total_amount;

			// Verify offer and apply discount only if ALL ordered products are in applicable_on
			if (offer_used) {
				const offer = await offerModel
					.findById(offer_used)
					.session(session);
				if (!offer) {
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{ success: false, error: "Invalid offer" },
						{ status: 400 }
					);
				}

				// Check if all products in the order are in the offer's applicable_on list
				const allProductsInOffer = product_ordered.every(
					(productId: string) =>
						offer.applicable_on.includes(productId)
				);

				if (allProductsInOffer) {
					// Apply offer discount to amount_paid
					amount_paid =
						amount_paid -
						(amount_paid * offer.offer_discount) / 100;
				} else {
					// If not all products are eligible, don't apply offer
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{
							success: false,
							error: "Offer cannot be applied - not all products are eligible",
						},
						{ status: 400 }
					);
				}
			}

			// Verify coupon and apply discount to amount_paid
			if (coupon_used) {
				const coupon = await couponModel
					.findById(coupon_used)
					.session(session);
				if (!coupon) {
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{ success: false, error: "Invalid coupon" },
						{ status: 400 }
					);
				}

				// Check if coupon has expired
				if (new Date() > coupon.end_at) {
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{ success: false, error: "Coupon has expired" },
						{ status: 400 }
					);
				}

				// Apply coupon discount to amount_paid
				amount_paid =
					amount_paid - (amount_paid * coupon.discount) / 100;
			}

			// Verify address
			const addressExists =
				await AddressModel.findById(address_id).session(session);
			if (!addressExists) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Invalid address" },
					{ status: 400 }
				);
			}

			// Create order with both total_amount and amount_paid
			const [order] = await orderModel.create(
				[
					{
						user_id: auth.userId,
						product_ordered,
						size_ordered,
						quantity_ordered,
						coupon_used,
						offer_used,
						total_amount, // Original total
						amount_paid, // Amount after discounts
						address: address_id,
						transcation_id,
						status: "pending",
					},
				],
				{ session }
			);

			// Update product sales count and creator total sales
			for (let i = 0; i < product_ordered.length; i++) {
				const product = await productModel
					.findById(product_ordered[i])
					.populate("creator_id")
					.session(session);

				// Update product sales count
				await productModel.findByIdAndUpdate(
					product_ordered[i],
					{ $inc: { sales_count: quantity_ordered[i] } },
					{ session }
				);

				// Update creator total sales
				if (product.creator_id) {
					const saleAmount =
						product.price.amount * quantity_ordered[i];
					await CreatorModel.findByIdAndUpdate(
						product.creator_id,
						{ $inc: { totalSales: saleAmount } },
						{ session }
					);
				}
			}

			// Populate order details
			const populatedOrder = await orderModel
				.findById(order._id)
				.session(session);
			// .populate([
			// 	{
			// 		path: "product_ordered",
			// 		model: "Product",
			// 		populate: {
			// 			path: "creator_id",
			// 			model: "Creator",
			// 		},
			// 	},
			// 	{
			// 		path: "address",
			// 		model: "Address",
			// 	},
			// 	{
			// 		path: "coupon_used",
			// 		model: "couponSchema",
			// 	},
			// 	{
			// 		path: "offer_used",
			// 		model: "offerSchema",
			// 	},
			// ]);

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Order created successfully",
					data: populatedOrder,
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
		console.error("Error creating order:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to create order",
			},
			{ status: 500 }
		);
	}
}

// === Example Request ===
// {
// 	"product_ordered": ["67e34283d001c2fc0ec7110d"],
// 	"size_ordered": ["M"],
// 	"quantity_ordered": [1],
// 	"coupon_used": ["67e34283d001c2fc0ec7110d"],
// 	"offer_used": ["67e34283d001c2fc0ec7110d"],
// 	"transcation_id": "67e34283d001c2fc0ec7110d",
// }

// get all orders
export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			UserModel.findOne().exec(),
			orderModel.findOne().exec(),
			AuthModel.findOne().exec(),
			productModel.findOne().exec(),
		]).catch(() => {});

		// Authentication check
		const accessToken = request.cookies.get("accessToken")?.value;
		const refreshToken = request.cookies.get("refreshToken")?.value;

		if (!accessToken || !refreshToken) {
			return NextResponse.json(
				{ success: false, error: "No access token provided" },
				{ status: 401 }
			);
		}

		const auth = await AuthModel.findOne({ accessToken, refreshToken });

		if (!auth) {
			return NextResponse.json(
				{ success: false, error: "Invalid access token" },
				{ status: 401 }
			);
		}

		// Populate configuration
		const populateOptions = [
			{
				path: "product_ordered",
				model: "Product",
				populate: [
					{
						path: "creator_id",
						model: "Creator",
					},
					{
						path: "image_id",
						model: "ImageDetail",
					},
				],
			},
			{
				path: "address",
				model: "Address",
			},
			{
				path: "coupon_used",
				model: "couponSchema",
			},
			{
				path: "offer_used",
				model: "offerSchema",
			},
		];

		// Get the order ID from query params
		const { searchParams } = new URL(request.url);
		const orderId = searchParams.get("id");

		// If order ID is provided, fetch that specific order
		if (orderId) {
			const order = await orderModel.findById(orderId);
			// .populate(populateOptions);

			// Check if order exists
			if (!order) {
				return NextResponse.json(
					{ success: false, error: "Order not found" },
					{ status: 404 }
				);
			}

			// Check if the order belongs to the authenticated user
			if (order.user_id.toString() !== auth.userId.toString()) {
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to access this order",
					},
					{ status: 403 }
				);
			}

			return NextResponse.json(
				{ success: true, data: order },
				{ status: 200 }
			);
		}

		// If no order ID is provided, fetch all orders for the authenticated user
		// Add pagination support
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const status = searchParams.get("status"); // Optional status filter

		// Build query with user_id and optional status filter
		const query: any = { user_id: auth.userId };
		if (status) {
			query.status = status;
		}

		// Get total count for pagination
		const total = await orderModel.countDocuments(query);

		// Get paginated results
		const orders = await orderModel
			.find(query)
			// .populate(populateOptions)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit);

		if (orders.length === 0) {
			return NextResponse.json(
				{
					success: true,
					data: {
						orders: [],
						pagination: { total: 0, page, limit, pages: 0 },
					},
				},
				{ status: 200 }
			);
		}

		return NextResponse.json(
			{
				success: true,
				data: {
					orders,
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
		console.error("Error fetching orders:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch orders",
			},
			{ status: 500 }
		);
	}
}
// === Example Endpoint ===
// Request to get order by id
// method: GET
// url: http://localhost:3000/api/order?id=67e34283d001c2fc0ec7110d
// {
// 	"id": "67e34283d001c2fc0ec7110d",
// }

// Request to get all orders
// method: GET
// url: http://localhost:3000/api/order
// {
// 	"id": "67e34283d001c2fc0ec7110d",
// }

// Request to with pagination
// method: GET
// url: http://localhost:3000/api/order?page=1&limit=10&status=pending
// {
// 	"page": 1,
// 	"limit": 10,
// 	"status": "pending",
// }

export async function DELETE(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			UserModel.findOne().exec(),
			orderModel.findOne().exec(),
			AuthModel.findOne().exec(),
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

			// Get the order ID from query params
			const { searchParams } = new URL(request.url);
			const orderId = searchParams.get("id");

			if (!orderId) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Order ID is required" },
					{ status: 400 }
				);
			}

			// Find the order
			const order = await orderModel.findById(orderId).session(session);

			if (!order) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Order not found" },
					{ status: 404 }
				);
			}

			// Check if the order belongs to the authenticated user
			if (order.user_id.toString() !== auth.userId.toString()) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to delete this order",
					},
					{ status: 403 }
				);
			}

			// Check if order can be deleted (e.g., only pending orders)
			if (order.status !== "pending") {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Only pending orders can be deleted",
					},
					{ status: 400 }
				);
			}

			// Revert sales counts for products
			for (let i = 0; i < order.product_ordered.length; i++) {
				const productId = order.product_ordered[i];
				const quantity = order.quantity_ordered[i];

				// Decrease product sales count
				await productModel.findByIdAndUpdate(
					productId,
					{ $inc: { sales_count: -quantity } },
					{ session }
				);

				// Get product to find creator
				const product = await productModel
					.findById(productId)
					.session(session);

				// Decrease creator total sales if creator exists
				if (product && product.creator_id) {
					const saleAmount = product.price.amount * quantity;
					await CreatorModel.findByIdAndUpdate(
						product.creator_id,
						{ $inc: { totalSales: -saleAmount } },
						{ session }
					);
				}
			}

			// Delete the order
			await orderModel.findByIdAndDelete(orderId, { session });

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Order deleted successfully",
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
		console.error("Error deleting order:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to delete order",
			},
			{ status: 500 }
		);
	}
}

// === Example Endpoint ===
// Request to delete order
// method: DELETE
// url: http://localhost:3000/api/order?id=67e34283d001c2fc0ec7110d
// {
// 	"id": "67e34283d001c2fc0ec7110d",
// }

// Request to delete order with invalid order id
// method: DELETE
// url: http://localhost:3000/api/order?id=67e34283d001c2fc0ec7110d
// {
// 	"id": "67e34283d001c2fc0ec7110d",
// }
