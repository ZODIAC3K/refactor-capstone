import nodemailer from "nodemailer";

export const animationCreate = async () => {
	if (typeof window !== "undefined") {
		const wow = await import("wow.js");
		new wow.default().init();
	}
};

interface EmailConfig {
	HOST: string;
	SERVICE: string;
	EMAIL_PORT: string | number;
	SECURE: string | boolean;
	MAIL_USERNAME: string;
	MAIL_PASSWORD: string;
}

// Import from environment variables using the correct names
const { HOST, SERVICE, EMAIL_PORT, SECURE, MAIL_USERNAME, MAIL_PASSWORD } =
	process.env as unknown as EmailConfig;

interface EmailOptions {
	email: string;
	subject: string;
	text: string;
	html?: string;
}

// This is just a wrapper that will be used on the client
// but will delegate to the server-only implementation
export async function sendEmail({
	email,
	subject,
	text,
	html,
}: EmailOptions): Promise<void> {
	try {
		console.log("Email config:", {
			host: HOST,
			service: SERVICE,
			port: Number(EMAIL_PORT),
			secure: SECURE === "true",
			auth: {
				user: MAIL_USERNAME,
				pass: "****", // Don't log the actual password
			},
		});

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

		console.log("Email sent successfully", info.messageId);
	} catch (error) {
		console.log("Email not sent!");
		console.error(error);

		// During development, don't throw the error to prevent transaction failures
		if (process.env.APP_ENV === "production") {
			throw error;
		}
	}
}

export default sendEmail;
