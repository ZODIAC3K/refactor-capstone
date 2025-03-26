import { NextRequest } from "next/server";
import objectModel from "@/models/objectSchema";
import dbConnect from "@/lib/mongodb";
import { uploadObjectToS3 } from "@/utils/uploadObjectS3";
import productModel from "@/models/productSchema";

export async function GET(request: NextRequest) {
	try {
		await dbConnect();
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (id) {
			// Fetch single object
			const object = await objectModel.findById(id);

			if (!object) {
				return Response.json(
					{ success: false, error: "Object not found" },
					{ status: 404 }
				);
			}

			return Response.json({ success: true, data: object });
		}

		// Fetch all objects
		const objects = await objectModel.find().sort({ created_at: -1 });

		return Response.json({ success: true, data: objects });
	} catch (error) {
		return Response.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch objects",
			},
			{ status: 500 }
		);
	}
}

// === Example JSON (single object) ===
// Request at: http://localhost:3000/api/object
// Method: GET
// Query Params:
// ?id=66f091a9b511458168a109ca

// Response:
// {
// 	"success": true,
// 	"data": {
// 		"_id": "66f091a9b511458168a109ca",
// 		"name": "Object 1",
// 		"description": "Object 1 description",
// 		"modelUrl": "https://zodiac3k-bucket.s3.amazonaws.com/models/1716666666666-object1.glb",
// 		"position": { "x": 0, "y": 0, "z": 0 },
// 		"rotation": { "x": 0, "y": 0, "z": 0 },
// 		"scale": { "x": 1, "y": 1, "z": 1 },
// 		"created_at": "2024-03-25T00:00:00.000Z",
// 		"updated_at": "2024-03-25T00:00:00.000Z"
// 	}
// }

// === Example JSON (all objects) ===
// Request at: http://localhost:3000/api/object
// Method: GET
// Response:
// {
// 	"success": true,
// 	"data": [
// 		{
// 			"_id": "66f091a9b511458168a109ca",
// 			"name": "Object 1",
// 			"description": "Object 1 description",
// 			"modelUrl": "https://zodiac3k-bucket.s3.amazonaws.com/models/1716666666666-object1.glb",
// 			"position": { "x": 0, "y": 0, "z": 0 },
// 			"rotation": { "x": 0, "y": 0, "z": 0 },
// 			"scale": { "x": 1, "y": 1, "z": 1 },
// 			"created_at": "2024-03-25T00:00:00.000Z",
// 			"updated_at": "2024-03-25T00:00:00.000Z"
// 		}
// 	]
// }

export async function POST(request: NextRequest) {
	try {
		await dbConnect();

		const formData = await request.formData();
		const modelFile = formData.get("model") as File;
		const name = formData.get("name") as string;
		const description = formData.get("description") as string;

		if (!modelFile || !name) {
			return Response.json(
				{ success: false, error: "Model file and name are required" },
				{ status: 400 }
			);
		}

		// Upload model to S3
		const buffer = Buffer.from(await modelFile.arrayBuffer());
		const s3Upload = await uploadObjectToS3(
			buffer,
			modelFile.name,
			"model/gltf-binary" // Adjust based on your model type
		);

		if (!s3Upload.success) {
			return Response.json(
				{ success: false, error: "Failed to upload model" },
				{ status: 500 }
			);
		}

		// Create object in database
		const object = await objectModel.create({
			name,
			description,
			modelUrl: s3Upload.url,
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			scale: { x: 1, y: 1, z: 1 },
		});

		return Response.json({ success: true, data: object }, { status: 201 });
	} catch (error) {
		return Response.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to create object",
			},
			{ status: 500 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/object
// Method: POST
// Body:
// {
// 	"model": "model.glb",
// 	"name": "Object 1",
// 	"description": "Object 1 description"
// }

// Response:
// {
// 	"success": true,
// 	"data": {
// 		"_id": "66f091a9b511458168a109ca",
// 		"name": "Object 1",
// 		"description": "Object 1 description",
// 		"modelUrl": "https://zodiac3k-bucket.s3.amazonaws.com/models/1716666666666-object1.glb",
// 		"position": { "x": 0, "y": 0, "z": 0 },
// 		"rotation": { "x": 0, "y": 0, "z": 0 },
// 		"scale": { "x": 1, "y": 1, "z": 1 },
// 		"created_at": "2024-03-25T00:00:00.000Z",
// 		"updated_at": "2024-03-25T00:00:00.000Z"
// }

export async function PATCH(request: NextRequest) {
	try {
		await dbConnect();

		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return Response.json(
				{ success: false, error: "Object ID is required" },
				{ status: 400 }
			);
		}

		const body = await request.json();

		// Prevent updating modelUrl directly
		delete body.modelUrl;

		const updatedObject = await objectModel.findByIdAndUpdate(
			id,
			{ $set: body },
			{ new: true, runValidators: true }
		);

		if (!updatedObject) {
			return Response.json(
				{ success: false, error: "Object not found" },
				{ status: 404 }
			);
		}

		return Response.json({
			success: true,
			message: "Object updated successfully",
			data: updatedObject,
		});
	} catch (error) {
		return Response.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to update object",
			},
			{ status: 500 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/object
// Method: PATCH
// Query Params:
// ?id=66f091a9b511458168a109ca
// Body:
// {
// 	"name": "Updated Object 1",
// 	"description": "Updated description",
// 	"position": { "x": 1, "y": 2, "z": 3 },
// 	"rotation": { "x": 0, "y": 0, "z": 0 },
// 	"scale": { "x": 1, "y": 1, "z": 1 }
// }

// Response:
// {
// 	"success": true,
// 	"data": {
// 		"_id": "66f091a9b511458168a109ca",
// 		"name": "Updated Object 1",
// 		"description": "Updated description",
// 		"modelUrl": "https://zodiac3k-bucket.s3.amazonaws.com/models/1716666666666-object1.glb",
// 		"position": { "x": 0, "y": 0, "z": 0 },
// 		"rotation": { "x": 0, "y": 0, "z": 0 },
// 		"scale": { "x": 1, "y": 1, "z": 1 },
// 		"created_at": "2024-03-25T00:00:00.000Z",
// 		"updated_at": "2024-03-25T00:00:00.000Z"
// }

export async function DELETE(request: NextRequest) {
	try {
		await dbConnect();

		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return Response.json(
				{ success: false, error: "Object ID is required" },
				{ status: 400 }
			);
		}

		// Check if object is being used by any products
		const productsUsingObject = await productModel.findOne({
			model_id: id,
		});
		if (productsUsingObject) {
			return Response.json(
				{
					success: false,
					error: "Cannot delete object as it is being used by products",
				},
				{ status: 400 }
			);
		}

		const deletedObject = await objectModel.findByIdAndDelete(id);

		if (!deletedObject) {
			return Response.json(
				{ success: false, error: "Object not found" },
				{ status: 404 }
			);
		}

		// Note: You might want to also delete the file from S3
		// This would require implementing a deleteFromS3 utility

		return Response.json({
			success: true,
			message: "Object deleted successfully",
		});
	} catch (error) {
		return Response.json(
			{
				success: false,
				error:
					error instanceof Error
						? error.message
						: "Failed to delete object",
			},
			{ status: 500 }
		);
	}
}

// === Example JSON ===
// Request at: http://localhost:3000/api/object
// Method: DELETE
// Query Params:
// ?id=66f091a9b511458168a109ca

// Response:
// {
// 	"success": true,
// 	"data": {
// 		"_id": "66f091a9b511458168a109ca",
// 		"name": "Object 1",
// 		"description": "Object 1 description",
// 		"modelUrl": "https://zodiac3k-bucket.s3.amazonaws.com/models/1716666666666-object1.glb",
// 		"position": { "x": 0, "y": 0, "z": 0 },
// 		"rotation": { "x": 0, "y": 0, "z": 0 },
// 		"scale": { "x": 1, "y": 1, "z": 1 },
// 		"created_at": "2024-03-25T00:00:00.000Z",
// 		"updated_at": "2024-03-25T00:00:00.000Z"
// }
