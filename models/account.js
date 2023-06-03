import mongoose from "mongoose";

const Schema = mongoose.Schema;

const accountSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true  },
  url: { type: 'String', required: false },
  description: { type: String, required: false },
  verified: { type: Boolean, required: true },
  created_at: { type: String, required: true },
  protected: { type: Boolean, required: false },
  profile_image_url: { type: String, required: true },
  profile_banner_url: { type: String, required: false },
  last_updated: { type: String, required: true },
  public_metrics: {
    followers_count: { type: Number, required: true },
    following_count: { type: Number, required: true },
    tweet_count: { type: Number, required: false },
    listed_count: { type: Number, required: false },
  },
  verified_type: { type: String, required: false },
  pinned_tweet_id: { type: String, required: false },
});

var accountsModel = mongoose.model('Accounts', accountSchema);
export default accountsModel;