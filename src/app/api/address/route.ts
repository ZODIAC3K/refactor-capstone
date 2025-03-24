import { NextRequest, NextResponse } from "next/server";
import { UserModel } from "@/models/userSchema";
import dbConnect from "@/lib/mongodb";
import AuthModel from "@/models/authSchema";
import { AddressModel } from "@/models/addressSchema";

export async function POST(request: NextRequest) {
	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}

		const accessToken = request.cookies.get("accessToken")?.value;
		const refreshToken = request.cookies.get("refreshToken")?.value;

		if (!accessToken || !refreshToken) {
			return NextResponse.json(
				{ error: "No access token provided" },
				{ status: 401 }
			);
		}

		const session = await db.startSession();
		session.startTransaction();

		try {
			// Verify auth token
			const auth = await AuthModel.findOne({
				accessToken,
				refreshToken,
			}).session(session);

			if (!auth) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Invalid token" },
					{ status: 401 }
				);
			}

			// Get and validate request body
			const body = await request.json();

			if (
				!body.address ||
				!body.address.firstLine ||
				!body.address.pincode ||
				!body.address.city ||
				!body.address.state
			) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Missing required address fields" },
					{ status: 400 }
				);
			}

			// Check existing addresses
			const addressCount = await AddressModel.countDocuments({
				user_id: auth.userId,
			}).session(session);

			// Create new address document
			const newAddress = await AddressModel.create(
				[
					{
						user_id: auth.userId,
						address: body.address,
						default: addressCount === 0,
					},
				],
				{ session }
			);

			// Update the user's savedAddress array
			await UserModel.findByIdAndUpdate(
				auth.userId,
				{
					$push: { savedAddress: newAddress[0]._id },
				},
				{ session }
			);

			await session.commitTransaction();

			// Return both the new address and updated user
			const updatedUser = await UserModel.findById(auth.userId)
				.populate("savedAddress")
				.session(session);

			return NextResponse.json(
				{
					address: newAddress[0],
				},
				{ status: 201 }
			);
		} catch (error: any) {
			await session.abortTransaction();
			console.error("Validation or creation error:", error);
			return NextResponse.json(
				{ error: error.message || "Failed to create address" },
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
