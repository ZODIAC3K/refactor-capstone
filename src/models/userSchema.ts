import { Schema, model, models } from "mongoose";

const userDetailSchema = new Schema({
	email: {
		type: String,
		required: true,
		trim: true,
		unique: true,
		lowercase: true,
		validate: {
			validator: function (value: string) {
				const pattern =
					/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
				return pattern.test(value);
			},
			message: "Invalid email address format",
		},
	},
	password: {
		type: String,
		required: true,
		trim: true,
		validate: {
			validator: function (value: string) {
				// Define a regular expression pattern for a strong password
				const pattern =
					/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!(){}[\]:;"'<>,.?/~\\-_]).{8,}$/;
				// Test the value against the pattern
				return pattern.test(value);
			},
			message:
				"Password must contain at least 8 characters, including one lowercase letter, one uppercase letter, one number, and one special character",
		},
	}, // Store hashed password
	status: { type: Boolean, default: true },
	fname: { type: String, required: true },
	lname: { type: String, required: true },
	mobile: {
		type: String,
		required: true,
		validate: {
			validator: function (value: string) {
				// Define a regular expression pattern for a valid mobile number
				// For a 10-digit number (adjust as needed)
				const pattern = /^\d{10}$/;

				// Test the value against the pattern
				return pattern.test(value);
			},
			message: "Invalid mobile number format",
		},
	},
	email_verification: { type: Boolean, default: false },
	profile_picture: {
		type: Schema.Types.ObjectId,
		ref: "ImageDetail",
		default: null,
	},
	created_at: { type: Date, default: Date.now },
	modified_at: { type: Date, default: Date.now },
	coupon_used: [{ type: Schema.Types.ObjectId, ref: "couponSchema" }],
	savedAddress: [
		{
			type: Schema.Types.ObjectId,
			ref: "addressschema",
		},
	],
});

// Prevent model recompilation in development due to Next.js hot reloading
const UserModel = models.UserDetail || model("UserDetail", userDetailSchema);

export default UserModel;
