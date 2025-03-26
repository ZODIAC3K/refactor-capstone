import { model, models, Schema } from "mongoose";

const CreatorSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "UserDetail",
			required: true,
		},

		name: {
			type: String,
			required: true,
			unique: true,
		},

		bio: {
			type: String,
			default: "",
		},

		quote: {
			type: String,
			default: "",
		},

		creatorProfilePicture: {
			type: Schema.Types.ObjectId,
			ref: "ImageDetail",
			default: null,
		},

		creatorCoverImage: {
			type: Schema.Types.ObjectId,
			ref: "ImageDetail",
			default: null,
		},
		products: [
			{
				type: Schema.Types.ObjectId,
				ref: "Product",
			},
		],

		totalSales: {
			type: Number,
			default: 0,
		}, // total sales of all products combined (amount in INR)

		royaltyPercentage: {
			type: Number,
			default: 30,
		}, // 0-100 percentage
	},
	{ timestamps: true }
);

const CreatorModel = models.Creator || model("Creator", CreatorSchema);

export { CreatorModel };
