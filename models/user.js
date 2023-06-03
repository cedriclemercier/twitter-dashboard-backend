import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: false },
  username: { type: String, required: false, unique: true },
  followed_ids: [
    { type: mongoose.Types.ObjectId, required: false, ref: "Accounts" },
  ],
  followed_author_ids: [{ type: String, required: false, ref: "Tweets" }],
  
  twitter_id: { type: String, required: false },
  twitter_id_str: { type: String, required: false },
  twitter_username: { type: String, required: false },
  twitter_profile_image_url: { type: String, required: false },
  twitter_name: { type: String, required: false },
  twitter_description: { type: String, required: false },
});

export default mongoose.model("Users", userSchema);
