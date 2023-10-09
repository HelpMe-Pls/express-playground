import { Schema as _Schema, model } from "mongoose";

const Schema = _Schema;

const GenreSchema = new Schema({
  name: { type: String, required: true, minLength: 3, maxLength: 100 },
});

// Virtual for this genre instance URL.
GenreSchema.virtual("url").get(function () {
  return "/catalog/genre/" + this._id;
});

// Export model.
export default model("Genre", GenreSchema);
