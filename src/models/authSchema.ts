import { Schema, model, models } from "mongoose";

const authSchema = new Schema(
	{
		accessToken: { type: String, required: true },
		accessTokenExpiry: { type: Date, required: true },
		refreshToken: { type: String, required: true },
		refreshTokenExpiry: { type: Date, required: true },
		userId: {
			type: Schema.Types.ObjectId,
			ref: "UserDetail",
			required: true,
		},
		description: { type: String, required: true, default: "email-login" },
	},
	{
		timestamps: true,
	}
);

const AuthModel = models.Auth || model("Auth", authSchema);

export default AuthModel;
