import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import offerModal from "@/models/offerSchema";
import productModel from "@/models/productSchema";

export async function POST(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const { offer_code, product_id } = await request.json();
		if (!offer_code) {
			return NextResponse.json(
				{ error: "Offer code is required" },
				{ status: 400 }
			);
		}

		// TODO: Uncomment this when productModal is created

		if (!product_id) {
			return NextResponse.json(
				{ error: "Product ID is required" },
				{ status: 400 }
			);
		}

		const product = await productModel.findById(product_id);
		if (!product) {
			return NextResponse.json(
				{ error: "Product not found" },
				{ status: 400 }
			);
		}

		const offer = await offerModal.findOne({ code: offer_code });
		if (!offer) {
			return NextResponse.json(
				{ error: "Offer code is invalid" },
				{ status: 400 }
			);
		}
		if (offer.end_at < new Date()) {
			return NextResponse.json(
				{ error: "Offer code is expired" },
				{ status: 400 }
			);
		}
		// TODO: Uncomment this when productModal is created
		// for (const product_id of offer.applicable_on) {
		// 	const product = await productModal.findById(product_id);
		// 	if (!product) {
		// 		return NextResponse.json(
		// 			{ error: "Offer is not applicable on the product" },
		// 			{ status: 400 }
		// 		);
		// 	}
		// }

		return NextResponse.json(
			{ message: "Offer code is valid" },
			{ status: 200 }
		);
	} catch (error: any) {
		console.error("Error verifying offer:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to verify offer" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/offer/verify
// Method: POST
// Body:
// {
// 	"offer_code": "OFFER1",
// 	"product_id": ["66f091a9b511458168a109ca", "66f091a9b511458168a109cb"]
// }

// Response:
// {
// 	"message": "Offer code is valid"
// }
