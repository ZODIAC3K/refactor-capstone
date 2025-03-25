import CategoryModel from "@/models/categorySchema";
import dbConnect from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const { category_id } = await request.json();
		if (!category_id) {
			return NextResponse.json(
				{ error: "Category ID is required" },
				{ status: 400 }
			);
		}
		const category = await CategoryModel.findById(category_id);
		if (!category) {
			return NextResponse.json(
				{ error: "Category not found" },
				{ status: 404 }
			);
		}
		return NextResponse.json({ category }, { status: 200 });
	} catch (error: any) {
		console.error("Error fetching category:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch category" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/category/detail
// Method: POST
// Body:
// {
// 	"category_id": "66f091a9b511458168a109ca"
// }

// Response:
// {
// 	"category": {
// 		"_id": "66f091a9b511458168a109ca",
// 		"category_name": "Category 1",
// 		"createdAt": "2024-03-25T00:00:00.000Z",
// 		"updatedAt": "2024-03-25T00:00:00.000Z"
// 	}
// }
