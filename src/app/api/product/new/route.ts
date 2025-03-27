import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import productModel from "@/models/productSchema";

export async function GET(request: NextRequest) {
	try {
		await dbConnect();

		// Pre-register models to ensure they're available
		await productModel
			.findOne()
			.exec()
			.catch(() => {});

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
				path: "image_id",
				model: "ImageDetail",
			},
		];

		// Get 8 most recent products
		const recentProducts = await productModel
			.find()
			.populate(populateOptions)
			.sort({ createdAt: -1 }) // Sort by newest first
			.limit(8);

		return NextResponse.json(
			{
				success: true,
				data: recentProducts,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Error fetching recent products:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch recent products",
			},
			{ status: 500 }
		);
	}
}
