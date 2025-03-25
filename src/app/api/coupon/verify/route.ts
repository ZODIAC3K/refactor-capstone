import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import couponModal from "@/models/couponSchema";

export async function POST(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const { coupon_code } = await request.json();
		if (!coupon_code) {
			return NextResponse.json(
				{ error: "Coupon code is required" },
				{ status: 400 }
			);
		}
		const coupon = await couponModal.findOne({ code: coupon_code });
		if (!coupon) {
			return NextResponse.json(
				{ error: "Coupon code is invalid" },
				{ status: 400 }
			);
		}
		if (coupon.end_at < new Date()) {
			return NextResponse.json(
				{ error: "Coupon code is expired" },
				{ status: 400 }
			);
		}
		return NextResponse.json(
			{ message: "Coupon code is valid" },
			{ status: 200 }
		);
	} catch (error: any) {
		console.error("Error verifying coupon:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to verify coupon" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/coupon/verify
// Method: POST
// Body:
// {
// 	"coupon_code": "COUPON1"
// }

// Response:
// {
// 	"message": "Coupon code is valid"
// }
