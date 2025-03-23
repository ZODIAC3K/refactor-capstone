import { Schema, models, model } from "mongoose";

const imageDetailSchema = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: "UserDetail", required: true },
	data: { type: Buffer, required: true },
	content_type: { type: String, required: true },
});

const ImageModel =
	models.ImageDetail || model("ImageDetail", imageDetailSchema);

export { ImageModel, imageDetailSchema };
