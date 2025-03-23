// Mark this file as server-only
import nodemailer from "nodemailer";

interface EmailOptions {
	email: string;
	subject: string;
	text: string;
	html?: string;
}

export async function sendEmailServer({
	email,
	subject,
	text,
	html,
}: EmailOptions): Promise<void> {
	try {
		const transporter = nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			service: process.env.EMAIL_SERVICE,
			port: Number(process.env.EMAIL_PORT),
			secure: process.env.EMAIL_SECURE === "true",
			auth: {
				user: process.env.EMAIL_USERNAME,
				pass: process.env.EMAIL_PASSWORD,
			},
		});

		await transporter.sendMail({
			from: process.env.EMAIL_USERNAME,
			to: email,
			subject: subject,
			text: text,
			html: html,
		});

		console.log("Email sent successfully");
	} catch (error) {
		console.log("Email not sent!");
		console.error(error);
		throw error;
	}
}
