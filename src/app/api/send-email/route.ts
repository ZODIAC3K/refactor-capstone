import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";

const { HOST, SERVICE, EMAIL_PORT, SECURE, MAIL_USERNAME, MAIL_PASSWORD } =
	process.env;

export async function POST(request: NextRequest) {
	try {
		const { email, subject, text, html } = await request.json();

		const transporter = nodemailer.createTransport({
			host: HOST,
			service: SERVICE,
			port: Number(EMAIL_PORT),
			secure: SECURE === "true",
			auth: {
				user: MAIL_USERNAME,
				pass: MAIL_PASSWORD,
			},
		});

		const info = await transporter.sendMail({
			from: MAIL_USERNAME,
			to: email,
			subject: subject,
			text: text,
			html: html,
		});

		return NextResponse.json({
			success: true,
			messageId: info.messageId,
		});
	} catch (error: any) {
		console.error("Email sending failed:", error);
		return NextResponse.json(
			{ error: error.message || "Failed to send email" },
			{ status: 500 }
		);
	}
}
