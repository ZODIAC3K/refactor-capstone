import { NextRequest, NextResponse } from "next/server";
import couponModal from "@/models/couponSchema";
import dbConnect from "@/lib/mongodb";

// Helper function to check missing fields
const getMissingFields = ({
	discount,
	title,
	description,
	end_at,
	code,
}: {
	discount: number;
	title: string;
	description: string;
	end_at: Date;
	code: string;
}) => {
	const missing = [];
	if (!discount) missing.push("discount");
	if (!title) missing.push("title");
	if (!description) missing.push("description");
	if (!end_at) missing.push("end_at");
	if (!code) missing.push("code");
	return missing;
};

export async function POST(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const { discount, title, description, end_at, code } =
			await request.json();
		const missingFields = getMissingFields({
			discount,
			title,
			description,
			end_at,
			code,
		});

		if (missingFields.length > 0) {
			return NextResponse.json(
				{
					error: "Required fields missing",
					message: `Please provide: ${missingFields.join(", ")}`,
				},
				{ status: 400 }
			);
		}
		const coupon_code_exist = await couponModal.findOne({ code });
		if (coupon_code_exist) {
			return NextResponse.json(
				{ error: "Coupon code already exists" },
				{ status: 400 }
			);
		}
		const coupon = await couponModal.create({
			discount,
			title,
			description,
			end_at,
			code,
		});
		return NextResponse.json({ coupon }, { status: 201 });
	} catch (error: any) {
		console.error("Error creating coupon:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to create coupon" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/coupon
// Method: POST
// Body:
// {
// 	"discount": 10,
// 	"title": "Coupon 1",
// 	"description": "Coupon 1 description",
// 	"end_at": "2024-03-25T00:00:00.000Z",
// 	"code": "COUPON1"
// }

// Response:
// {
// 	"coupon": {
// 		"_id": "66f091a9b511458168a109ca",
// 		"discount": 10,
// 		"title": "Coupon 1",
// 		"code": "COUPON1",
// 		"description": "Coupon 1 description",
// 		"end_at": "2024-03-25T00:00:00.000Z",
// 		"createdAt": "2024-03-25T00:00:00.000Z",
// 		"updatedAt": "2024-03-25T00:00:00.000Z"
// 	}
// }

export async function GET(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const coupons = await couponModal.find();
		return NextResponse.json({ coupons }, { status: 200 });
	} catch (error: any) {
		console.error("Error creating coupon:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to get coupons" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/coupon
// Method: GET
// Response:
// {
// 	"coupons": [
// 		{
// 			"_id": "66f091a9b511458168a109ca",
// 			"discount": 10,
// 			"title": "Coupon 1",
// 			"code": "COUPON1",
// 			"description": "Coupon 1 description",
// 			"end_at": "2024-03-25T00:00:00.000Z",
// 			"createdAt": "2024-03-25T00:00:00.000Z",
// 			"updatedAt": "2024-03-25T00:00:00.000Z"
// 		}
// 	]
// }

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
			const { coupon_id, discount, title, description, end_at, code } =
				await request.json();
			if (!coupon_id) {
				return NextResponse.json(
					{ error: "Coupon ID is required" },
					{ status: 400 }
				);
			}
			// Check if code exists and is different from current coupon's code
			if (code) {
				const existingCoupon = await couponModal
					.findOne({
						code: code,
						_id: { $ne: coupon_id }, // Exclude current coupon from check
					})
					.session(session);

				if (existingCoupon) {
					await session.abortTransaction();
					return NextResponse.json(
						{
							error: "Coupon code already exists",
							message: "Please use a different coupon code",
						},
						{ status: 400 }
					);
				}
			}

			// If code is unique or unchanged, proceed with update
			const coupon = await couponModal.findByIdAndUpdate(
				{ _id: coupon_id },
				{
					discount,
					title,
					description,
					end_at,
					code,
				},
				{
					new: true,
					session,
				}
			);

			if (!coupon) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Coupon not found" },
					{ status: 404 }
				);
			}

			await session.commitTransaction();

			return NextResponse.json(
				{
					message: "Coupon updated successfully",
					coupon,
				},
				{ status: 200 }
			);
		} catch (error: any) {
			await session.abortTransaction();
			console.error("Error updating coupon:", error);
			return NextResponse.json(
				{ error: error.message || "Failed to update coupon" },
				{ status: 400 }
			);
		} finally {
			session.endSession();
		}
	} catch (error: any) {
		console.error("Server error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/coupon
// Method: PATCH
// Body:
// {
// 	"coupon_id": "66f091a9b511458168a109ca",
// 	"discount": 10,
// 	"title": "Coupon 2",
// 	"description": "Coupon 2 description",
// 	"end_at": "2024-03-25T00:00:00.000Z",
// 	"code": "COUPON2"
// }

// Response:
// {
// 	"message": "Coupon updated successfully",
// 	"coupon": {
// 		"_id": "66f091a9b511458168a109ca",
// 		"discount": 10,
// 		"title": "Coupon 2",
// 		"code": "COUPON2",
// 		"description": "Coupon 2 description",
// 		"end_at": "2024-03-25T00:00:00.000Z",
// 		"createdAt": "2024-03-25T00:00:00.000Z",
// 		"updatedAt": "2024-03-25T00:00:00.000Z"
// 	}
// }

export async function DELETE(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const { coupon_id } = await request.json();
		if (!coupon_id) {
			return NextResponse.json(
				{ error: "Coupon ID is required" },
				{ status: 400 }
			);
		}
		const coupon = await couponModal.findByIdAndDelete(coupon_id);
		if (!coupon) {
			return NextResponse.json(
				{ error: "Coupon not found" },
				{ status: 404 }
			);
		}
		return NextResponse.json(
			{ message: "Coupon deleted successfully" },
			{ status: 200 }
		);
	} catch (error: any) {
		console.error("Error deleting coupon:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to delete coupon" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/coupon
// Method: DELETE
// Body:
// {
// 	"coupon_id": "66f091a9b511458168a109ca"
// }

// Response:
// {
// 	"message": "Coupon deleted successfully"
// }
