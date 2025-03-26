import { NextRequest, NextResponse } from "next/server";
import UserModel from "@/models/userSchema";
import dbConnect from "@/lib/mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AuthModel from "@/models/authSchema";
import mongoose from "mongoose";
import { cookies } from "next/headers";

// Define types for better type safety
interface LoginRequest {
	email: string;
	password: string;
}

interface UserDocument extends mongoose.Document {
	_id: mongoose.Types.ObjectId;
	email: string;
	password: string;
	fname: string;
	lname: string;
	email_verification: boolean;
}

interface TokenPayload {
	userId: string;
	email?: string;
}

export async function POST(request: NextRequest) {
	if (!process.env.SALT) {
		return NextResponse.json(
			{ error: "SALT is not defined" },
			{ status: 500 }
		);
	}

	try {
		const db = await dbConnect();
		if (!db) {
			return NextResponse.json(
				{ error: "Failed to connect to database" },
				{ status: 500 }
			);
		}
		const requestBody = (await request.json()) as LoginRequest;
		const { email, password } = requestBody;
		console.log(" === email === ", email);
		console.log(" === password === ", password);

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 }
			);
		}

		const user = (await UserModel.findOne({
			email,
		})) as UserDocument | null;
		console.log(" === user password === ", user?.password);
		if (!user) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 }
			);
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return NextResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 }
			);
		}

		if (!user.email_verification) {
			return NextResponse.json(
				{ error: "Please verify your email before logging in" },
				{ status: 403 }
			);
		}

		const jwtSecret = process.env.JWT_SECRET || "zodiac3k";
		if (!jwtSecret) {
			throw new Error("JWT_SECRET is not defined");
		}

		const accessTokenPayload: TokenPayload = {
			userId: user._id.toString(),
			email: user.email,
		};

		const refreshTokenPayload: TokenPayload = {
			userId: user._id.toString(),
		};
		//@ts-ignore
		const accessToken = jwt.sign(accessTokenPayload, jwtSecret, {
			expiresIn: process.env.JWT_EXPIRES_IN || "1h",
		});
		//@ts-ignore
		const refreshToken = jwt.sign(refreshTokenPayload, jwtSecret, {
			expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "7d",
		});

		const auth = await AuthModel.create({
			userId: user._id,
			accessToken,
			accessTokenExpiry: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
			refreshToken,
			refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
			description: "email-login",
		});

		if (!auth) {
			return NextResponse.json(
				{ error: "Failed to create auth token" },
				{ status: 500 }
			);
		}
		// setting cookies for the user from the server side
		const cookieStore = await cookies();
		cookieStore.set("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 1 * 60 * 60, // 1 hour
		});
		cookieStore.set("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60, // 7 days
		});

		cookieStore.set("socialAuthProvider", "email-login", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 1 * 60 * 60, // 1 hour
		});

		return NextResponse.json(
			{
				success: true,
				accessToken,
				refreshToken,
				user: {
					id: user._id.toString(),
					email: user.email,
					name: `${user.fname} ${user.lname}`,
				},
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error("Login error:", error);
		const errorMessage =
			error instanceof Error
				? error.message
				: "An unexpected error occurred";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
