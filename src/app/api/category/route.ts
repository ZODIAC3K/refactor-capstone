import { NextRequest, NextResponse } from "next/server";
import CategoryModel from "@/models/categorySchema";
import dbConnect from "@/lib/mongodb";

export async function GET(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const categories = await CategoryModel.find();
		return NextResponse.json({ categories }, { status: 200 });
	} catch (error: any) {
		console.error("Error fetching categories:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to fetch categories" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/category
// Method: GET
// Response:
// {
// 	"categories": [
// 		{
// 			"_id": "66f091a9b511458168a109ca",
// 			"category_name": "Category 1",
// 			"createdAt": "2024-03-25T00:00:00.000Z",
// 			"updatedAt": "2024-03-25T00:00:00.000Z"
// 		}
// 	]
// }

export async function POST(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const { category_name } = await request.json();
		const category_exist = await CategoryModel.findOne({
			category_name,
		});
		if (category_exist) {
			return NextResponse.json(
				{ error: "Category already exists" },
				{ status: 400 }
			);
		}
		const category = await CategoryModel.create({ category_name });
		return NextResponse.json({ category }, { status: 201 });
	} catch (error: any) {
		console.error("Error creating category:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to create category" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/category
// Method: POST
// Body:
// {
// 	"category_name": "Category 1"
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

export async function PATCH(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const { category_id, category_name } = await request.json();
		if (!category_id || !category_name) {
			return NextResponse.json(
				{ error: "Category ID and category name are required" },
				{ status: 400 }
			);
		}
		const category = await CategoryModel.findByIdAndUpdate(
			category_id,
			{ category_name },
			{ new: true }
		);
		if (!category) {
			return NextResponse.json(
				{ error: "Category not found" },
				{ status: 404 }
			);
		}
		return NextResponse.json({ category }, { status: 200 });
	} catch (error: any) {
		console.error("Error updating category:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to update category" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/category
// Method: PUT
// Body:
// {
// 	"category_id": "66f091a9b511458168a109ca",
// 	"category_name": "Category 1"
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

export async function DELETE(request: NextRequest) {
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
		const category = await CategoryModel.findByIdAndDelete(category_id);
		if (!category) {
			return NextResponse.json(
				{ error: "Category not found" },
				{ status: 404 }
			);
		}
		return NextResponse.json(
			{ message: "Category deleted successfully", category },
			{ status: 200 }
		);
	} catch (error: any) {
		console.error("Error deleting category:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to delete category" },
			{ status: 400 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/category
// Method: DELETE
// Body:
// {
// 	"category_id": "66f091a9b511458168a109ca"
// }

// Response:
// {
// 	"message": "Category deleted successfully"
// }
