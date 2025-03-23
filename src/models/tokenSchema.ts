import mongoose, { Schema, models, model } from "mongoose";

const tokenSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: "UserDetail",
		unique: true,
	},
	token: { type: String, required: true },
	createdAt: { type: Date, default: Date.now, expires: 3600 },
});

export const tokenModel = models.Token || model("Token", tokenSchema);
export { tokenSchema };
export default tokenModel;
