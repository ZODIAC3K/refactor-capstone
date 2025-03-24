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
			const accessToken = request.cookies.get("accessToken")?.value;
			const refreshToken = request.cookies.get("refreshToken")?.value;

			if (!accessToken && !refreshToken) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "No access token provided" },
					{ status: 401 }
				);
			}

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

			const body = await request.json();

			if (!body.addressId || !body.address) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Address ID and details are required" },
					{ status: 400 }
				);
			}

			// Validate address fields
			if (
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

			// Find the address and verify it belongs to the user
			const address = await AddressModel.findOne({
				_id: body.addressId,
				user_id: auth.userId,
			}).session(session);

			if (!address) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Address not found or does not belong to user" },
					{ status: 404 }
				);
			}

			// If setting this address as default
			if (body.default === true) {
				// First, set all user's addresses to default: false
				await AddressModel.updateMany(
					{ user_id: auth.userId },
					{ default: false },
					{ session }
				);
			}

			// Update the address
			const updatedAddress = await AddressModel.findByIdAndUpdate(
				body.addressId,
				{
					address: body.address,
					default: body.default, // Now correctly accessing default from body root
				},
				{ new: true, session }
			);

			await session.commitTransaction();

			return NextResponse.json(
				{
					address: updatedAddress,
					message: "Address updated successfully",
				},
				{ status: 200 }
			);
		} catch (error: any) {
			await session.abortTransaction();
			console.error("Address update error:", error);
			return NextResponse.json(
				{ error: error.message || "Failed to update address" },
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

// ==== Example body for address update ====
// {
//     "addressId": "address_id",
//     "address": {
//         "firstLine": "123 Main Street",
//         "secondLine": "Apartment 4B",
//         "pincode": 400001,
//         "city": "Mumbai",
//         "state": "Maharashtra"
//     },
//     "default": true // optional, default is false anyway.
// }
// ==== Example body for address update ====

export async function DELETE(request: NextRequest) {
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

		if (!accessToken && !refreshToken) {
			return NextResponse.json(
				{ error: "No access token provided" },
				{ status: 401 }
			);
		}

		// Parse the request body
		const body = await request.json();
		if (!body.addressId) {
			return NextResponse.json(
				{ error: "Address ID is required" },
				{ status: 400 }
			);
		}

		const session = await db.startSession();
		session.startTransaction();

		try {
			// Find auth record
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

			// Find the address to be deleted
			const addressToDelete = await AddressModel.findById(
				body.addressId
			).session(session);

			if (!addressToDelete) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Address not found" },
					{ status: 404 }
				);
			}

			// Check if the address belongs to the user
			const user = await UserModel.findById(auth.userId).session(session);
			if (!user) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "User not found" },
					{ status: 404 }
				);
			}

			// Check if the address is in the user's savedAddress array
			const addressIndex = user.savedAddress.findIndex(
				(addr: any) => addr.toString() === body.addressId
			);

			if (addressIndex === -1) {
				await session.abortTransaction();
				return NextResponse.json(
					{ error: "Address does not belong to this user" },
					{ status: 403 }
				);
			}

			// Check if the address being deleted was the default
			const wasDefault = addressToDelete.default;

			// Remove the address from the user's savedAddress array
			user.savedAddress.splice(addressIndex, 1);
			await user.save({ session });

			// Delete the address
			await AddressModel.findByIdAndDelete(body.addressId).session(
				session
			);

			// If the deleted address was the default and there are other addresses,
			// set the first remaining address as default
			if (wasDefault && user.savedAddress.length > 0) {
				const nextDefaultAddress = await AddressModel.findByIdAndUpdate(
					user.savedAddress[0],
					{ default: true },
					{ new: true, session }
				);
			}

			await session.commitTransaction();

			return NextResponse.json(
				{
					message: "Address deleted successfully",
					newDefaultAddressId:
						wasDefault && user.savedAddress.length > 0
							? user.savedAddress[0]
							: null,
				},
				{ status: 200 }
			);
		} catch (error: any) {
			await session.abortTransaction();
			console.error("Address deletion error:", error);
			return NextResponse.json(
				{ error: error.message || "Failed to delete address" },
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

// ==== Example body for address deletion ====
// {
//     "addressId": "address_id_to_delete"
// }
// ==== Example body for address deletion ====

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

		// Get the path from URL
		const { pathname } = new URL(request.url);
		const isActiveRoute = pathname.endsWith("/active");

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

			if (isActiveRoute) {
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
			} else {
				// Get all addresses for the user
				const addresses = await AddressModel.find({
					user_id: auth.userId,
				}).session(session);

				await session.commitTransaction();

				return NextResponse.json({ addresses }, { status: 200 });
			}
		} catch (error: any) {
			await session.abortTransaction();
			console.error("Error fetching addresses:", error);
			return NextResponse.json(
				{ error: error.message || "Failed to fetch addresses" },
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
