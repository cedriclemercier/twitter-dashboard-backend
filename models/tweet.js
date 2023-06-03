import mongoose from "mongoose";

const Schema = mongoose.Schema;

const tweetSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, required: true },
  created_at: { type: Date, required: true },
  text: { type: String, required: true },
  public_metrics: {
    retweet_count: { type: Number, required: true },
    reply_count: { type: Number, required: true },
    like_count: { type: Number, required: true },
    quote_count: { type: Number, required: false },
    impression_count: { type: Number, required: false },
  },
  author_id: { type: String, required: true },
  profile_image_url: { type: String, required: true },
  likes: [{ type: String, required: false }],
  retweets: [{ type: String, required: false }],
  replies: [{ type: String, required: false }],
  edit_history_tweet_ids: [{ type: String, required: false }],
});

tweetSchema.pre("save", function (next) {
  this.likes = _.uniq(this.likes);
  this.retweets = _.uniq(this.retweets);
  this.replies = _.uniq(this.replies);
  next();
});

export default mongoose.model("Tweets", tweetSchema);
