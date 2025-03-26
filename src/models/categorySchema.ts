import { Schema, model, models } from "mongoose";

const categorySchema = new Schema(
	{
		category_name: { type: String, required: true },
	},
	{
		timestamps: true,
	}
);

const CategoryModel =
	models.categoryschema || model("categoryschema", categorySchema);

export default CategoryModel;
