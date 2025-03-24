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
		},

		bio: {
			type: String,
			default: null,
		},

		quote: {
			type: String,
			default: null,
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

		socialLinks: {
			type: Map,
			of: String,
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
		},
	},
	{ timestamps: true }
);

const CreatorModel = models.Creator || model("Creator", CreatorSchema);

export { CreatorModel };
