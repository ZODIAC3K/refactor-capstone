import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import AuthModel from "@/models/authSchema";
import Transaction from "@/models/transactionSchema";
import orderModel from "@/models/orderSchema";

// Helper function to check authentication
async function authenticateUser(
	request: NextRequest,
	session?: mongoose.ClientSession
) {
	const accessToken = request.cookies.get("accessToken")?.value;
	const refreshToken = request.cookies.get("refreshToken")?.value;

	if (!accessToken || !refreshToken) {
		return {
			success: false,
			status: 401,
			error: "No access token provided",
		};
	}

	const options = session ? { session } : {};
	const auth = await AuthModel.findOne(
		{ accessToken, refreshToken },
		null,
		options
	);

	if (!auth) {
		return { success: false, status: 401, error: "Invalid access token" };
	}

	return { success: true, auth };
}

// GET endpoint - get transaction(s)
export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			Transaction.findOne().exec(),
			AuthModel.findOne().exec(),
			orderModel.findOne().exec(),
		]).catch(() => {});

		// Check authentication
		const authResult = await authenticateUser(request);
		if (!authResult.success) {
			return NextResponse.json(
				{ success: false, error: authResult.error },
				{ status: authResult.status }
			);
		}

		const auth = authResult.auth;

		// Get the transaction ID from query params
		const { searchParams } = new URL(request.url);
		const transactionId = searchParams.get("id");
		const orderId = searchParams.get("orderId");

		// Configure population
		const populateOptions = [
			{ path: "user_id", model: "UserDetail", select: "-password" },
			{
				path: "order_id",
				model: "Order",
				populate: {
					path: "product_ordered",
					model: "Product",
				},
			},
		];

		// If transaction ID is provided, fetch that specific transaction
		if (transactionId) {
			const transaction =
				await Transaction.findById(transactionId).populate(
					populateOptions
				);

			if (!transaction) {
				return NextResponse.json(
					{ success: false, error: "Transaction not found" },
					{ status: 404 }
				);
			}

			// Check if transaction belongs to authenticated user
			if (transaction.user_id.toString() !== auth.userId.toString()) {
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to access this transaction",
					},
					{ status: 403 }
				);
			}

			return NextResponse.json(
				{ success: true, data: transaction },
				{ status: 200 }
			);
		}

		// If order ID is provided, fetch transaction for that order
		if (orderId) {
			const transaction = await Transaction.findOne({
				order_id: orderId,
			}).populate(populateOptions);

			if (!transaction) {
				return NextResponse.json(
					{
						success: false,
						error: "Transaction not found for this order",
					},
					{ status: 404 }
				);
			}

			// Check if transaction belongs to authenticated user
			if (transaction.user_id.toString() !== auth.userId.toString()) {
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to access this transaction",
					},
					{ status: 403 }
				);
			}

			return NextResponse.json(
				{ success: true, data: transaction },
				{ status: 200 }
			);
		}

		// If no specific ID is provided, fetch all transactions for the user
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");

		// Get total count for pagination
		const total = await Transaction.countDocuments({
			user_id: auth.userId,
		});

		// Get paginated results
		const transactions = await Transaction.find({ user_id: auth.userId })
			.populate(populateOptions)
			.sort({ _id: -1 }) // Sort by newest first
			.skip((page - 1) * limit)
			.limit(limit);

		return NextResponse.json(
			{
				success: true,
				data: {
					transactions,
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
		console.error("Error fetching transaction:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch transaction",
			},
			{ status: 500 }
		);
	}
}

// PATCH endpoint - update transaction
export async function PATCH(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			Transaction.findOne().exec(),
			AuthModel.findOne().exec(),
		]).catch(() => {});

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Check authentication
			const authResult = await authenticateUser(request, session);
			if (!authResult.success) {
				return NextResponse.json(
					{ success: false, error: authResult.error },
					{ status: authResult.status }
				);
			}

			const auth = authResult.auth;
			const data = await request.json();

			// Validate required fields
			if (!data.id) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Transaction ID is required" },
					{ status: 400 }
				);
			}

			// Find the transaction
			const transaction = await Transaction.findById(data.id).session(
				session
			);

			if (!transaction) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Transaction not found" },
					{ status: 404 }
				);
			}

			// Verify ownership
			if (transaction.user_id.toString() !== auth.userId.toString()) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to update this transaction",
					},
					{ status: 403 }
				);
			}

			// Update fields
			const updateData: any = {};
			if (data.razorpay_payment_id)
				updateData.razorpay_payment_id = data.razorpay_payment_id;
			if (data.razorpay_order_id)
				updateData.razorpay_order_id = data.razorpay_order_id;
			if (data.razorpay_signature)
				updateData.razorpay_signature = data.razorpay_signature;

			// Apply updates
			const updatedTransaction = await Transaction.findByIdAndUpdate(
				data.id,
				{ $set: updateData },
				{ new: true, session }
			).populate([
				{ path: "user_id", model: "UserDetail", select: "-password" },
				{ path: "order_id", model: "Order" },
			]);

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Transaction updated successfully",
					data: updatedTransaction,
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
		console.error("Error updating transaction:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to update transaction",
			},
			{ status: 500 }
		);
	}
}

// DELETE endpoint - delete transaction
export async function DELETE(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			Transaction.findOne().exec(),
			AuthModel.findOne().exec(),
			orderModel.findOne().exec(),
		]).catch(() => {});

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Check authentication
			const authResult = await authenticateUser(request, session);
			if (!authResult.success) {
				return NextResponse.json(
					{ success: false, error: authResult.error },
					{ status: authResult.status }
				);
			}

			const auth = authResult.auth;

			// Get transaction ID from query params
			const { searchParams } = new URL(request.url);
			const transactionId = searchParams.get("id");

			if (!transactionId) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Transaction ID is required" },
					{ status: 400 }
				);
			}

			// Find the transaction
			const transaction =
				await Transaction.findById(transactionId).session(session);

			if (!transaction) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Transaction not found" },
					{ status: 404 }
				);
			}

			// Verify ownership
			if (transaction.user_id.toString() !== auth.userId.toString()) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to delete this transaction",
					},
					{ status: 403 }
				);
			}

			// Update related order if needed
			const order = await orderModel
				.findById(transaction.order_id)
				.session(session);
			if (order) {
				// Only allow deletion of transactions for pending orders
				if (order.status !== "pending") {
					await session.abortTransaction();
					session.endSession();
					return NextResponse.json(
						{
							success: false,
							error: "Cannot delete transaction for non-pending orders",
						},
						{ status: 400 }
					);
				}

				// Update order to remove transaction reference if needed
				// This depends on your business logic
			}

			// Delete the transaction
			await Transaction.findByIdAndDelete(transactionId, { session });

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Transaction deleted successfully",
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
		console.error("Error deleting transaction:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to delete transaction",
			},
			{ status: 500 }
		);
	}
}

// === Example Requests and Responses ===

// 1. GET Transaction by ID
// GET http://localhost:3000/api/transaction?id=67e34283d001c2fc0ec7110d
// Response:
// {
//     "success": true,
//     "data": {
//         "_id": "67e34283d001c2fc0ec7110d",
//         "user_id": {
//             "_id": "67e34283d001c2fc0ec7110e",
//             "email": "user@example.com",
//             "fname": "John",
//             "lname": "Doe"
//         },
//         "order_id": {
//             "_id": "67e34283d001c2fc0ec7110f",
//             "product_ordered": [...]
//         },
//         "razorpay_payment_id": "pay_12345",
//         "razorpay_order_id": "order_12345",
//         "razorpay_signature": "signature_12345"
//     }
// }

// 2. GET Transaction by Order ID
// GET http://localhost:3000/api/transaction?orderId=67e34283d001c2fc0ec7110f
// Response: Similar to above

// 3. GET All Transactions (paginated)
// GET http://localhost:3000/api/transaction?page=1&limit=10
// Response:
// {
//     "success": true,
//     "data": {
//         "transactions": [...],
//         "pagination": {
//             "total": 20,
//             "page": 1,
//             "limit": 10,
//             "pages": 2
//         }
//     }
// }

// 4. PATCH Transaction
// PATCH http://localhost:3000/api/transaction
// Body:
// {
//     "id": "67e34283d001c2fc0ec7110d",
//     "razorpay_payment_id": "pay_updated",
//     "razorpay_signature": "signature_updated"
// }
// Response:
// {
//     "success": true,
//     "message": "Transaction updated successfully",
//     "data": {...} // Updated transaction
// }

// 5. DELETE Transaction
// DELETE http://localhost:3000/api/transaction?id=67e34283d001c2fc0ec7110d
// Response:
// {
//     "success": true,
//     "message": "Transaction deleted successfully"
// }
