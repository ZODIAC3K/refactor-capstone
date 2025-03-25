import offerModal from "@/models/offerSchema";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
// import productModal from "@/models/productSchema";

const getMissingFields = ({
	offer_discount,
	title,
	description,
	applicable_on,
	end_at,
	code,
}: {
	offer_discount: number;
	title: string;
	description: string;
	applicable_on: string[];
	end_at: Date;
	code: string;
}) => {
	const missing = [];
	if (!offer_discount) missing.push("offer_discount");
	if (!title) missing.push("title");
	if (!description) missing.push("description");
	if (!applicable_on) missing.push("applicable_on");
	if (!end_at) missing.push("end_at");
	if (!code) missing.push("code");
	return missing;
};

export async function POST(request: NextRequest) {
	const db = await dbConnect();
	if (!db) {
		return NextResponse.json(
			{ error: "Failed to connect to database" },
			{ status: 500 }
		);
	}

	// if body length is more then 5 variables then return error
	if (Object.keys(await request.json()).length > 5) {
		return NextResponse.json(
			{ error: "Body length is more than 5 variables" },
			{ status: 400 }
		);
	}

	const { offer_discount, title, description, applicable_on, end_at, code } =
		await request.json();

	const missingFields = getMissingFields({
		offer_discount,
		title,
		description,
		applicable_on,
		end_at,
		code,
	});
	if (missingFields.length > 0) {
		return NextResponse.json(
			{ error: `Missing fields: ${missingFields.join(", ")}` },
			{ status: 400 }
		);
	}
	const offer_code_exist = await offerModal.findOne({ code });
	// TODO: Check if applicable_on is valid product ID and if it is, check if it is a valid product
	// TODO: Check if end_at is a valid date
	// TODO: Uncomment this when productModal is created
	// if (applicable_on.length > 0) {
	// 	const applicable_on_exist = await productModal.find({
	// 		_id: { $in: applicable_on },
	// 	});
	// 	if (applicable_on_exist.length !== applicable_on.length) {
	// 		return NextResponse.json({ error: "Invalid product ID" }, { status: 400 }
	// 		);
	// 	}
	// }
	if (offer_code_exist) {
		return NextResponse.json(
			{ error: "Offer code already exists" },
			{ status: 400 }
		);
	}
	const offer = await offerModal.create({
		offer_discount,
		title,
		description,
		applicable_on,
		end_at,
		code,
	});
	return NextResponse.json(offer);
}

// === Example JSON ===
// Request at: http://localhost:3000/api/offer
// Method: POST
// Body:
// {
// 	"offer_discount": 10,
// 	"title": "Offer 1",
// 	"description": "Offer 1 description",
// 	"applicable_on": ["66f091a9b511458168a109ca"],
// 	"end_at": "2024-03-25T00:00:00.000Z",
// 	"code": "OFFER1"
// }

// Response:
// {
// 	"_id": "66f091a9b511458168a109ca",
// 	"offer_discount": 10,
// 	"title": "Offer 1",
// 	"description": "Offer 1 description",
// 	"applicable_on": ["66f091a9b511458168a109ca"],
// 	"code": "OFFER1",
// }

export async function GET(request: NextRequest) {
	const db = await dbConnect();
	if (!db) {
		return NextResponse.json(
			{ error: "Failed to connect to database" },
			{ status: 500 }
		);
	}
	const offers = await offerModal.find();
	if (!offers) {
		return NextResponse.json({ error: "No offers found" }, { status: 404 });
	}
	return NextResponse.json(offers, { status: 200 });
}

// === Example JSON ===
// Request at: http://localhost:3000/api/offer
// Method: GET
// Response:
// {
// 	"_id": "66f091a9b511458168a109ca",
// 	"offer_discount": 10,
// 	"title": "Offer 1",
// 	"description": "Offer 1 description",
// 	"applicable_on": ["66f091a9b511458168a109ca"],
// 	"code": "OFFER1",
// }

export async function PATCH(request: NextRequest) {
	const db = await dbConnect();
	if (!db) {
		return NextResponse.json(
			{ error: "Failed to connect to database" },
			{ status: 500 }
		);
	}
	const {
		offer_id,
		offer_discount,
		title,
		description,
		applicable_on,
		end_at,
		code,
	} = await request.json();
	if (!offer_id) {
		return NextResponse.json(
			{ error: "Offer ID is required" },
			{ status: 400 }
		);
	}

	const missingFields = getMissingFields({
		offer_discount,
		title,
		description,
		applicable_on,
		end_at,
		code,
	});
	if (missingFields.length > 0) {
		return NextResponse.json(
			{ error: `Missing fields: ${missingFields.join(", ")}` },
			{ status: 400 }
		);
	}
	const offer_code_exist = await offerModal.findOne({
		code,
		_id: { $ne: offer_id },
	});
	if (offer_code_exist) {
		return NextResponse.json(
			{ error: "Offer code already exists" },
			{ status: 400 }
		);
	}

	const offer = await offerModal.findByIdAndUpdate(
		{ _id: offer_id },
		{
			offer_discount,
			title,
			description,
			applicable_on,
			end_at,
			code,
		},
		{ new: true }
	);
	return NextResponse.json(offer);
}

// === Example JSON ===
// Request at: http://localhost:3000/api/offer
// Method: PATCH
// Body:
// {
// 	"offer_id": "66f091a9b511458168a109ca",
// 	"offer_discount": 10,
// 	"title": "Offer 1",
// 	"description": "Offer 1 description",
// 	"applicable_on": ["66f091a9b511458168a109ca"],
// 	"end_at": "2024-03-25T00:00:00.000Z",
// 	"code": "OFFER1"
// }

// Response:
// {
// 	"_id": "66f091a9b511458168a109ca",
// 	"offer_discount": 10,
// 	"title": "Offer 1",
// 	"description": "Offer 1 description",
// 	"applicable_on": ["66f091a9b511458168a109ca"],
// 	"code": "OFFER1",
// }

export async function DELETE(request: NextRequest) {
	const db = await dbConnect();
	if (!db) {
		return NextResponse.json(
			{ error: "Failed to connect to database" },
			{ status: 500 }
		);
	}
	const { offer_id } = await request.json();
	if (!offer_id) {
		return NextResponse.json(
			{ error: "Offer ID is required" },
			{ status: 400 }
		);
	}
	const offer = await offerModal.findByIdAndDelete(offer_id);
	if (!offer) {
		return NextResponse.json({ error: "Offer not found" }, { status: 404 });
	}
	return NextResponse.json(
		{ message: "Offer deleted successfully" },
		{ status: 200 }
	);
}

// === Example JSON ===
// Request at: http://localhost:3000/api/offer
// Method: DELETE
// Body:
// { "offer_id": "66f091a9b511458168a109ca" }

// Response:
// { "message": "Offer deleted successfully" }
