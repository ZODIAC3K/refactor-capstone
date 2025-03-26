import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import AuthModel from "@/models/authSchema";
import ReturnModel from "@/models/returnSchema";
import orderModel from "@/models/orderSchema";
import { AddressModel } from "@/models/addressSchema";
import Transaction from "@/models/transactionSchema";

// POST: Create a new return/refund request
export async function POST(request: NextRequest) {
	try {
		await dbConnect();

		// Pre-register models
		await Promise.all([
			ReturnModel.findOne().exec(),
			AuthModel.findOne().exec(),
			orderModel.findOne().exec(),
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

			// Parse request data
			const { order_id, return_reason, return_address } =
				await request.json();

			// Validate required fields
			if (!order_id || !return_reason || !return_address) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Missing required fields" },
					{ status: 400 }
				);
			}

			// Verify order exists and belongs to user
			const order = await orderModel.findById(order_id).session(session);
			if (!order) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Order not found" },
					{ status: 404 }
				);
			}

			// Verify order belongs to the user
			if (order.user_id.toString() !== auth.userId.toString()) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to request return for this order",
					},
					{ status: 403 }
				);
			}

			// Verify order status is "Delivered"
			if (order.status !== "Delivered") {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Only delivered orders can be returned",
					},
					{ status: 400 }
				);
			}

			// Verify return address exists
			const addressExists =
				await AddressModel.findById(return_address).session(session);
			if (!addressExists) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Invalid return address" },
					{ status: 400 }
				);
			}

			// Check if return already exists for this order
			const existingReturn = await ReturnModel.findOne({
				order_id,
			}).session(session);
			if (existingReturn) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Return already requested for this order",
					},
					{ status: 400 }
				);
			}

			// Create return request
			const [returnRequest] = await ReturnModel.create(
				[
					{
						order_id,
						user_id: auth.userId,
						return_reason,
						return_address,
						status: "Requested",
					},
				],
				{ session }
			);

			// Update order status
			await orderModel.findByIdAndUpdate(
				order_id,
				{ status: "Return Requested" },
				{ session }
			);

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Return request created successfully",
					data: returnRequest,
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
		console.error("Error creating return request:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to create return request",
			},
			{ status: 500 }
		);
	}
}

// GET: Fetch return requests (all or by ID)
export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			ReturnModel.findOne().exec(),
			AuthModel.findOne().exec(),
			orderModel.findOne().exec(),
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

		// Configure population
		const populateOptions = [
			{
				path: "order_id",
				model: "Order",
				populate: [
					{ path: "product_ordered", model: "Product" },
					{ path: "address", model: "Address" },
				],
			},
			{ path: "return_address", model: "Address" },
			{ path: "refund_transaction_id", model: "Transaction" },
		];

		// Get return ID from query params
		const { searchParams } = new URL(request.url);
		const returnId = searchParams.get("id");
		const orderId = searchParams.get("orderId");

		// If return ID is provided, fetch that specific return
		if (returnId) {
			const returnRequest =
				await ReturnModel.findById(returnId).populate(populateOptions);

			if (!returnRequest) {
				return NextResponse.json(
					{ success: false, error: "Return request not found" },
					{ status: 404 }
				);
			}

			// Check if return belongs to authenticated user
			if (returnRequest.user_id.toString() !== auth.userId.toString()) {
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to access this return request",
					},
					{ status: 403 }
				);
			}

			return NextResponse.json(
				{ success: true, data: returnRequest },
				{ status: 200 }
			);
		}

		// If order ID is provided, fetch return for that order
		if (orderId) {
			const returnRequest = await ReturnModel.findOne({
				order_id: orderId,
			}).populate(populateOptions);

			if (!returnRequest) {
				return NextResponse.json(
					{
						success: false,
						error: "No return request found for this order",
					},
					{ status: 404 }
				);
			}

			// Check if return belongs to authenticated user
			if (returnRequest.user_id.toString() !== auth.userId.toString()) {
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to access this return request",
					},
					{ status: 403 }
				);
			}

			return NextResponse.json(
				{ success: true, data: returnRequest },
				{ status: 200 }
			);
		}

		// If no specific ID is provided, fetch all returns for the user
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const status = searchParams.get("status"); // Optional status filter

		// Build query
		const query: any = { user_id: auth.userId };
		if (status) {
			query.status = status;
		}

		// Get total count for pagination
		const total = await ReturnModel.countDocuments(query);

		// Get paginated results
		const returns = await ReturnModel.find(query)
			.populate(populateOptions)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit);

		return NextResponse.json(
			{
				success: true,
				data: {
					returns,
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
		console.error("Error fetching return requests:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch return requests",
			},
			{ status: 500 }
		);
	}
}

// PATCH: Update return request status (mostly for admin usage)
export async function PATCH(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			ReturnModel.findOne().exec(),
			AuthModel.findOne().exec(),
			orderModel.findOne().exec(),
			Transaction.findOne().exec(),
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

			// Parse request data
			const { id, status, admin_notes, refund_transaction_id } =
				await request.json();

			// Validate required fields
			if (!id || !status) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Return ID and status are required",
					},
					{ status: 400 }
				);
			}

			// Find the return request
			const returnRequest =
				await ReturnModel.findById(id).session(session);

			if (!returnRequest) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Return request not found" },
					{ status: 404 }
				);
			}

			// User can cancel their own return request if it's still in "Requested" status
			// Otherwise, only admin should be able to update (add admin check here)
			if (
				returnRequest.status !== "Requested" &&
				returnRequest.user_id.toString() === auth.userId.toString()
			) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Cannot update return request once it's being processed",
					},
					{ status: 403 }
				);
			}

			// Update return request
			const updateData: any = { status };
			if (admin_notes) updateData.admin_notes = admin_notes;
			if (refund_transaction_id)
				updateData.refund_transaction_id = refund_transaction_id;

			const updatedReturn = await ReturnModel.findByIdAndUpdate(
				id,
				updateData,
				{ new: true, session }
			).populate([
				{ path: "order_id", model: "Order" },
				{ path: "return_address", model: "Address" },
				{ path: "refund_transaction_id", model: "Transaction" },
			]);

			// Update order status based on return status
			if (status === "Approved" || status === "Processing") {
				await orderModel.findByIdAndUpdate(
					returnRequest.order_id,
					{ status: `Return ${status}` },
					{ session }
				);
			} else if (status === "Completed") {
				await orderModel.findByIdAndUpdate(
					returnRequest.order_id,
					{ status: "Returned" },
					{ session }
				);
			} else if (status === "Rejected") {
				await orderModel.findByIdAndUpdate(
					returnRequest.order_id,
					{ status: "Delivered" }, // Revert to delivered status
					{ session }
				);
			}

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Return request updated successfully",
					data: updatedReturn,
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
		console.error("Error updating return request:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to update return request",
			},
			{ status: 500 }
		);
	}
}

// DELETE: Cancel a pending return request (only allowed if status is "Requested")
export async function DELETE(request: NextRequest) {
	try {
		await dbConnect();
		await Promise.all([
			ReturnModel.findOne().exec(),
			AuthModel.findOne().exec(),
			orderModel.findOne().exec(),
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

			// Get return ID from query params
			const { searchParams } = new URL(request.url);
			const returnId = searchParams.get("id");

			if (!returnId) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Return ID is required" },
					{ status: 400 }
				);
			}

			// Find the return request
			const returnRequest =
				await ReturnModel.findById(returnId).session(session);

			if (!returnRequest) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{ success: false, error: "Return request not found" },
					{ status: 404 }
				);
			}

			// Verify ownership
			if (returnRequest.user_id.toString() !== auth.userId.toString()) {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized to cancel this return request",
					},
					{ status: 403 }
				);
			}

			// Verify status is "Requested"
			if (returnRequest.status !== "Requested") {
				await session.abortTransaction();
				session.endSession();
				return NextResponse.json(
					{
						success: false,
						error: "Only pending return requests can be cancelled",
					},
					{ status: 400 }
				);
			}

			// Get the order ID before deleting the return
			const orderId = returnRequest.order_id;

			// Delete the return request
			await ReturnModel.findByIdAndDelete(returnId, { session });

			// Update order status back to "Delivered"
			await orderModel.findByIdAndUpdate(
				orderId,
				{ status: "Delivered" },
				{ session }
			);

			await session.commitTransaction();
			session.endSession();

			return NextResponse.json(
				{
					success: true,
					message: "Return request cancelled successfully",
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
		console.error("Error cancelling return request:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to cancel return request",
			},
			{ status: 500 }
		);
	}
}

// ==================== API EXAMPLES ====================

// ===== POST: Create a new return/refund request =====

// Example 1: Successful return request creation
// POST http://localhost:3000/api/refund
// Body:
// {
//     "order_id": "67e34283d001c2fc0ec7110d",
//     "return_reason": "Product doesn't match description",
//     "return_address": "67e34283d001c2fc0ec7110e"
// }
// Response (201):
// {
//     "success": true,
//     "message": "Return request created successfully",
//     "data": {
//         "_id": "67e34283d001c2fc0ec7110f",
//         "order_id": "67e34283d001c2fc0ec7110d",
//         "user_id": "67e34283d001c2fc0ec7110c",
//         "status": "Requested",
//         "return_reason": "Product doesn't match description",
//         "return_address": "67e34283d001c2fc0ec7110e",
//         "createdAt": "2023-04-25T10:23:45.678Z",
//         "updatedAt": "2023-04-25T10:23:45.678Z"
//     }
// }

// Example 2: Missing required fields
// POST http://localhost:3000/api/refund
// Body:
// {
//     "order_id": "67e34283d001c2fc0ec7110d",
//     "return_reason": "Product doesn't match description"
//     // Missing return_address
// }
// Response (400):
// {
//     "success": false,
//     "error": "Missing required fields"
// }

// Example 3: Order not found
// POST http://localhost:3000/api/refund
// Body:
// {
//     "order_id": "67e34283d001c2fc0ec7110z", // Non-existent order
//     "return_reason": "Product doesn't match description",
//     "return_address": "67e34283d001c2fc0ec7110e"
// }
// Response (404):
// {
//     "success": false,
//     "error": "Order not found"
// }

// Example 4: Unauthorized access
// POST http://localhost:3000/api/refund
// Body:
// {
//     "order_id": "67e34283d001c2fc0ec7110d", // Order belongs to a different user
//     "return_reason": "Product doesn't match description",
//     "return_address": "67e34283d001c2fc0ec7110e"
// }
// Response (403):
// {
//     "success": false,
//     "error": "Unauthorized to request return for this order"
// }

// Example 5: Order not in delivered status
// POST http://localhost:3000/api/refund
// Body:
// {
//     "order_id": "67e34283d001c2fc0ec7110d", // Order is still in "Processing" status
//     "return_reason": "Product doesn't match description",
//     "return_address": "67e34283d001c2fc0ec7110e"
// }
// Response (400):
// {
//     "success": false,
//     "error": "Only delivered orders can be returned"
// }

// Example 6: Return already requested
// POST http://localhost:3000/api/refund
// Body:
// {
//     "order_id": "67e34283d001c2fc0ec7110d", // Return already exists for this order
//     "return_reason": "Changed my mind",
//     "return_address": "67e34283d001c2fc0ec7110e"
// }
// Response (400):
// {
//     "success": false,
//     "error": "Return already requested for this order"
// }

// ===== GET: Fetch return requests =====

// Example 1: Get return by ID
// GET http://localhost:3000/api/refund?id=67e34283d001c2fc0ec7110f
// Response (200):
// {
//     "success": true,
//     "data": {
//         "_id": "67e34283d001c2fc0ec7110f",
//         "order_id": {
//             "_id": "67e34283d001c2fc0ec7110d",
//             "user_id": "67e34283d001c2fc0ec7110c",
//             "status": "Return Requested",
//             "product_ordered": [
//                 {
//                     "_id": "67e34283d001c2fc0ec7111a",
//                     "title": "Product Name",
//                     "description": "Product description"
//                     // Other product details
//                 }
//             ],
//             "total_amount": 999,
//             "address": {
//                 "_id": "67e34283d001c2fc0ec7111b",
//                 "address1": "123 Main St",
//                 "city": "New York",
//                 // Other address details
//             }
//             // Other order details
//         },
//         "user_id": "67e34283d001c2fc0ec7110c",
//         "status": "Requested",
//         "return_reason": "Product doesn't match description",
//         "return_address": {
//             "_id": "67e34283d001c2fc0ec7110e",
//             "address1": "456 Oak Ave",
//             "city": "Chicago",
//             // Other address details
//         },
//         "createdAt": "2023-04-25T10:23:45.678Z",
//         "updatedAt": "2023-04-25T10:23:45.678Z"
//     }
// }

// Example 2: Return not found
// GET http://localhost:3000/api/refund?id=67e34283d001c2fc0ec7110z
// Response (404):
// {
//     "success": false,
//     "error": "Return request not found"
// }

// Example 3: Unauthorized access
// GET http://localhost:3000/api/refund?id=67e34283d001c2fc0ec7110f
// Response (403) - If return belongs to a different user:
// {
//     "success": false,
//     "error": "Unauthorized to access this return request"
// }

// Example 4: Get return by order ID
// GET http://localhost:3000/api/refund?orderId=67e34283d001c2fc0ec7110d
// Response (200):
// {
//     "success": true,
//     "data": {
//         // Same detailed return object as Example 1
//     }
// }

// Example 5: No return found for order
// GET http://localhost:3000/api/refund?orderId=67e34283d001c2fc0ec7110d
// Response (404):
// {
//     "success": false,
//     "error": "No return request found for this order"
// }

// Example 6: Get all returns for user
// GET http://localhost:3000/api/refund
// Response (200):
// {
//     "success": true,
//     "data": {
//         "returns": [
//             {
//                 "_id": "67e34283d001c2fc0ec7110f",
//                 "order_id": {
//                     // Populated order details
//                 },
//                 "status": "Requested",
//                 // Other return details
//             },
//             {
//                 "_id": "67e34283d001c2fc0ec7111c",
//                 "order_id": {
//                     // Populated order details
//                 },
//                 "status": "Approved",
//                 // Other return details
//             }
//         ],
//         "pagination": {
//             "total": 2,
//             "page": 1,
//             "limit": 10,
//             "pages": 1
//         }
//     }
// }

// Example 7: Get returns with pagination and status filter
// GET http://localhost:3000/api/refund?page=1&limit=5&status=Approved
// Response (200):
// {
//     "success": true,
//     "data": {
//         "returns": [
//             {
//                 "_id": "67e34283d001c2fc0ec7111c",
//                 "status": "Approved",
//                 // Other return details with populated references
//             }
//         ],
//         "pagination": {
//             "total": 1,
//             "page": 1,
//             "limit": 5,
//             "pages": 1
//         }
//     }
// }

// Example 8: No returns found (empty result)
// GET http://localhost:3000/api/refund?status=Rejected
// Response (200):
// {
//     "success": true,
//     "data": {
//         "returns": [],
//         "pagination": {
//             "total": 0,
//             "page": 1,
//             "limit": 10,
//             "pages": 0
//         }
//     }
// }

// ===== PATCH: Update return request =====

// Example 1: User cancels their pending return
// PATCH http://localhost:3000/api/refund
// Body:
// {
//     "id": "67e34283d001c2fc0ec7110f",
//     "status": "Cancelled"
// }
// Response (200):
// {
//     "success": true,
//     "message": "Return request updated successfully",
//     "data": {
//         "_id": "67e34283d001c2fc0ec7110f",
//         "status": "Cancelled",
//         // Other return details with populated references
//     }
// }

// Example 2: Admin approves a return
// PATCH http://localhost:3000/api/refund
// Body:
// {
//     "id": "67e34283d001c2fc0ec7110f",
//     "status": "Approved",
//     "admin_notes": "Customer request verified, approval granted."
// }
// Response (200):
// {
//     "success": true,
//     "message": "Return request updated successfully",
//     "data": {
//         "_id": "67e34283d001c2fc0ec7110f",
//         "status": "Approved",
//         "admin_notes": "Customer request verified, approval granted.",
//         // Other return details with populated references
//     }
// }

// Example 3: Admin processes refund
// PATCH http://localhost:3000/api/refund
// Body:
// {
//     "id": "67e34283d001c2fc0ec7110f",
//     "status": "Completed",
//     "admin_notes": "Refund processed",
//     "refund_transaction_id": "67e34283d001c2fc0ec7111d"
// }
// Response (200):
// {
//     "success": true,
//     "message": "Return request updated successfully",
//     "data": {
//         "_id": "67e34283d001c2fc0ec7110f",
//         "status": "Completed",
//         "admin_notes": "Refund processed",
//         "refund_transaction_id": {
//             "_id": "67e34283d001c2fc0ec7111d",
//             // Transaction details
//         },
//         // Other return details with populated references
//     }
// }

// Example 4: Return not found
// PATCH http://localhost:3000/api/refund
// Body:
// {
//     "id": "67e34283d001c2fc0ec7110z", // Non-existent return
//     "status": "Approved"
// }
// Response (404):
// {
//     "success": false,
//     "error": "Return request not found"
// }

// Example 5: User tries to update a return that's already being processed
// PATCH http://localhost:3000/api/refund
// Body:
// {
//     "id": "67e34283d001c2fc0ec7110f", // Return is already in Processing status
//     "status": "Cancelled"
// }
// Response (403):
// {
//     "success": false,
//     "error": "Cannot update return request once it's being processed"
// }

// Example 6: Missing required fields
// PATCH http://localhost:3000/api/refund
// Body:
// {
//     // Missing id or status
//     "admin_notes": "Some notes"
// }
// Response (400):
// {
//     "success": false,
//     "error": "Return ID and status are required"
// }

// ===== DELETE: Cancel a return request =====

// Example 1: Successfully cancel a pending return
// DELETE http://localhost:3000/api/refund?id=67e34283d001c2fc0ec7110f
// Response (200):
// {
//     "success": true,
//     "message": "Return request cancelled successfully"
// }

// Example 2: Return not found
// DELETE http://localhost:3000/api/refund?id=67e34283d001c2fc0ec7110z
// Response (404):
// {
//     "success": false,
//     "error": "Return request not found"
// }

// Example 3: Unauthorized access
// DELETE http://localhost:3000/api/refund?id=67e34283d001c2fc0ec7110f
// Response (403) - If return belongs to a different user:
// {
//     "success": false,
//     "error": "Unauthorized to cancel this return request"
// }

// Example 4: Cannot cancel a return that's already being processed
// DELETE http://localhost:3000/api/refund?id=67e34283d001c2fc0ec7110f
// Response (400) - If return is not in "Requested" status:
// {
//     "success": false,
//     "error": "Only pending return requests can be cancelled"
// }

// Example 5: Missing ID parameter
// DELETE http://localhost:3000/api/refund
// Response (400):
// {
//     "success": false,
//     "error": "Return ID is required"
// }
