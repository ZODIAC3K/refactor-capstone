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
		const response = await fetch("/api/send-email", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email,
				subject,
				text,
				html,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to send email");
		}

		const result = await response.json();
		console.log("Email sent successfully", result.messageId);
	} catch (error) {
		console.log("Email not sent!");
		console.error(error);

		if (process.env.NEXT_PUBLIC_APP_ENV === "production") {
			throw error;
		}
	}
}

export default sendEmail;
