import { Schema, model, models } from "mongoose";

const reviewSchema = new Schema({
	product_id: { type: Schema.Types.ObjectId, ref: "Product" },
	user_id: { type: Schema.Types.ObjectId, ref: "UserDetail" },
	message: String,
	rating: { type: Number, required: true },
	image_details_id: [{ type: Schema.Types.ObjectId, ref: "ImageDetail" }],
});

const ReviewModel = models.Review || model("Review", reviewSchema);

export default ReviewModel;
