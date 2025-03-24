import nodemailer from "nodemailer";

interface EmailOptions {
	email: string;
	subject: string;
	text: string;
	html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
	const { HOST, SERVICE, EMAIL_PORT, SECURE, MAIL_USERNAME, MAIL_PASSWORD } =
		process.env;

	try {
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
			to: options.email,
			subject: options.subject,
			text: options.text,
			html: options.html,
		});

		console.log("Email sent successfully", info.messageId);
	} catch (error) {
		console.log("Email not sent!");
		console.error(error);

		if (process.env.NODE_ENV === "production") {
			throw error;
		}
	}
}
