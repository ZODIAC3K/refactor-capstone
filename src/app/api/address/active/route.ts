import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import AuthModel from "@/models/authSchema";
import { AddressModel } from "@/models/addressSchema";

export async function GET(request: NextRequest) {
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

			// Get only the default/active address
			const activeAddress = await AddressModel.findOne({
				user_id: auth.userId,
				default: true,
			}).session(session);

			await session.commitTransaction();

			if (!activeAddress) {
				return NextResponse.json(
					{ message: "No default address found" },
					{ status: 404 }
				);
			}

			return NextResponse.json(
				{ address: activeAddress },
				{ status: 200 }
			);
		} catch (error: any) {
			await session.abortTransaction();
			console.error("Error fetching active address:", error);
			return NextResponse.json(
				{ error: error.message || "Failed to fetch active address" },
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
