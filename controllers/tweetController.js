import "dotenv/config";
import got from "got";
import moment from 'moment';

import Accounts from "../models/account.js";
import Tweets from "../models/tweet.js";
import User from "../models/user.js";
import oauth from "../config/oauth.js";
import HttpError from "../models/http-error.js";

// ================== MIDDLEWARE TWITTER API  ==================


const fetchTweetsApi = async (req, res, next) => {
  let { oauth_token, oauth_token_secret, ids } = req.body;
  if (req.body.username) {
    const username = req.body.username;
    let u
    try {
      u = await Accounts.findOne({ username: username })
    } catch (err) {
      console.log('fuck!')
    }

    ids = [u.id]
  }

  // if the data comes from another controller
  if (!oauth_token || !oauth_token_secret) {
    ids = res.locals.ids;
    oauth_token = res.locals.oauth_token
    oauth_token_secret = res.locals.oauth_token_secret
  }

  if (!oauth_token || !oauth_token_secret) {
    const error = new HttpError("Couldn't find secret or token!", 500);
    return next(error);
  }
  const token = {
    key: oauth_token,
    secret: oauth_token_secret,
  };

  console.log('LFG! ids to fetch:')
  console.log(ids)
  let allTweets = []
  for (const i of ids) {
    const fetchApi = `https://api.twitter.com/1.1/statuses/user_timeline.json?id=${i}&exclude_replies=true`;
    const authHeader = oauth.toHeader(
      oauth.authorize(
        {
          url: fetchApi,
          method: "GET",
        },
        token
      )
    );

    let apiResult;
    // TODO CONCAT API RESULTS
    try {
      apiResult = await got.get(fetchApi, {
        headers: {
          Authorization: authHeader["Authorization"],
        },
      }).json();
    } catch (err) {
      console.log(err)
    }


    if (!apiResult || apiResult.length == 0) {
      console.log('No tweets for those users')
      // const error = new HttpError("Couldn't find new tweets!", 500);
      // return next(error);
    }
    console.log('Retrieved tweets:', apiResult.length)
    allTweets = [...apiResult]
  }
  res.locals.newTweets = allTweets;
  res.locals.ids = ids;
  next();
}

const filterNewTweets = async (req, res, next) => {
  const newTweets = res.locals.newTweets;
  const ids = res.locals.ids;

  console.log('ids to find', ids)

  // 1. Fetch tweet data from db
  let oldTweets, users;
  try {
    users = await Accounts.find({ id: { $in: ids } })
    oldTweets = await Tweets.find({ author_id: { $in: ids } })
  } catch (err) {
    console.log(err)
  }

  if (!oldTweets || oldTweets.length == 0) {
    console.log('Couldnt find old tweets! Maybe account is new?')
  }

  // 2. Filter
  let tweets;
  tweets = newTweets.filter(n => !oldTweets.some(old => n.id_str === old.id));
  // Transform for schema (schema was API V2...)
  if (tweets.length === 0) console.log('no new tweets')
  tweets.forEach(item => {
    item.public_metrics = {
      retweet_count: item.retweet_count,
      like_count: item.favorite_count || item.retweeted_status.favorite_count,
      reply_count: -1
    }
    item.author_id = item.user.id_str
    item.id = item.id_str
    item.created_at = moment(item.created_at, 'dd MMM DD HH:mm:ss ZZ YYYY').toISOString() || moment(item.created_at).toISOString()
    item.name = users.find(el => el.id = item.author_id).name
    item.username = users.find(el => el.id = item.author_id).username
    item.profile_image_url = users.find(el => el.id = item.author_id).profile_image_url
  });

  // 3. Save!
  let result;
  try {
    result = await Tweets.insertMany(tweets)
  } catch (err) {
    console.log(err)
    const error = new HttpError('Problem inserting new tweets!', 500)
    next(error);
  }
  // 4. Update account last_updated
  // TODO update public metrics for existing ids!
  let accs;
  try {
    accs = await Accounts.updateMany({ id: { $in: ids } }, { last_updated: moment().toISOString() })
    console.log('Updating accounts last update!')
  } catch (err) {
    const error = new HttpError('Problem finding accounts to update last_update!', 500)
    next(error);
  }

  // if (result) {
  res.locals.username = users[0].username
  console.log('Inserting records: ', result.length)
  // };

  next();
}

const checkLastUpdate = async (req, res, next) => {
  // This middleware will run before tweets are retrieved from database. Its tasks are:
  const userId = req.query.userId;
  // const { userId, oauth_token, oauth_token_secret } = req.body;
  if (!userId || userId == "false") {
    return
  }
  const queryParams = {
    'exclude': 'retweets,replies',
    'tweet.fields': 'created_at,public_metrics',
    'expansions': 'author_id,entities.mentions.username',
    'user.fields': 'profile_image_url,created_at,username',
    'max_results': '10'
  }

  // 0. Get user followed accounts
  let result;
  try {
    result = await User.findById(userId).populate('followed_ids')
  } catch (err) {
    console.log(err)
  }

  
  // 1. Check when was the last time tweets were retrieved from twitter api
  let outdated_timelines = []
  const followedAccounts = result.followed_ids;
  const now = moment();

  for (const f of followedAccounts) {
    const last_updated = moment(f.last_updated);
    const difference = now.diff(last_updated, "hours")
    console.log(last_updated.format("dddd, MMMM Do YYYY, h:mm:ss a"))
    if (difference > 24) {
      console.log('Difference!', difference);
      outdated_timelines.push(f.id)
    }
  }

  // 2. If over a certain time (e.g 24 hrs), fetch tweets
  if (outdated_timelines.length > 0) {
    console.log('Outdated content! Fetching new tweets', outdated_timelines.length)
    res.locals.outdated_timelines = outdated_timelines;
  }

  next()
}


// ================== BASIC RETRIEVALS ==================

const getTweets = async (req, res, next) => {
  const userId = req.query.userId;
  let tweets, followIds, followAuthorIds;

  if (!userId) {
    console.log('Userid is false')
    next();
  }


  try {
    const user = await User.findById(userId);
    followAuthorIds = user.followed_author_ids;

    if (followAuthorIds.length == 0) {
      const error = new HttpError(
        "You haven't followed anyone yet!",
        500
      );
      return next(error);
    }
    tweets = await Tweets.find({
      author_id: { $in: followAuthorIds },
    }).sort({ created_at: -1 });
  } catch (err) {
    console.log('ERROR!')
    console.log(err);
    const error = new HttpError(
      "Cannot find tweets for the user. Try again",
      500
    );
    return next(error);
  }
  if (!tweets || tweets.length === 0) {
    return next(
      new Error("Could not find accounts for the provided user id"),
      404
    );
  }

  const returnResult = { outdated_timelines: res.locals.outdated_timelines, tweets: tweets.map((tweet) => tweet) }
  console.log('Get tweets. Returning results:')
  if (returnResult.outdated_timelines) console.log(returnResult.outdated_timelines.length, returnResult.tweets.length)
  res.json(returnResult);
};

const getTweetsByUsername = async (req, res, next) => {
  const username = req.params.username || res.locals.username;
  console.log('get by username', username)
  let tweets;
  try {
    tweets = await Tweets.find({ username: username }).sort({ created_at: -1 });;
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Cannot find tweets for the user. Try again",
      500
    );
    return next(error);
  }
  if (!tweets || tweets.length === 0) {
    return res.json({ tweets: [] })
  }

  res.json({
    tweets: tweets.map((tweet) => tweet.toObject({ getters: true })),
  });
};

// ================== INTERACTION QUERIES ==================

const interactionParams = (action, tweetid, userId) => {
  const obj = {
    like: {
      apiUrl: `${process.env.TWITTER_API_V1}/favorites/create.json?id=${tweetid}`,
      removeApiUrl: `${process.env.TWITTER_API_V1}/favorites/destroy.json?id=${tweetid}`,
      documentName: `likes`,
      findQuery: { id: tweetid, likes: '63c3e834042957cf3154f9c7' },
      updateQuery: [
        {
          $set: {
            likes: {
              $cond: [
                {
                  $in: ["63c3e834042957cf3154f9c7", "$likes"],
                },
                {
                  $setDifference: ["$likes", ["63c3e834042957cf3154f9c7"]],
                },
                {
                  $concatArrays: ["$likes", ["63c3e834042957cf3154f9c7"]],
                },
              ],
            },
          },
        },
      ]
    },
    retweet: {
      apiUrl: `${process.env.TWITTER_API_V1}/statuses/retweet/${tweetid}.json`,
      removeApiUrl: `${process.env.TWITTER_API_V1}/statuses/unretweet/${tweetid}.json`,
      documentName: `retweets`,
      findQuery: { id: tweetid, retweets: '63c3e834042957cf3154f9c7' },
      updateQuery: [
        {
          $set: {
            retweets: {
              $cond: [
                {
                  $in: ["63c3e834042957cf3154f9c7", "$retweets"],
                },
                {
                  $setDifference: ["$retweets", ["63c3e834042957cf3154f9c7"]],
                },
                {
                  $concatArrays: ["$retweets", ["63c3e834042957cf3154f9c7"]],
                },
              ],
            },
          },
        },
      ]
    },
    reply: {},
  };
  return obj[action]
};

const interactionHandler = (action) => {
  return async (req, res, next) => {
    const tweetid = req.params.id;
    const { userId, oauth_token, oauth_token_secret } = req.body;
    const { apiUrl, removeApiUrl, documentName, updateQuery, findQuery } = interactionParams(action, tweetid, userId)

    // 1. Check if userid has liked the tweet
    let tweet, url;
    let interacted = false;
    try {
      tweet = await Tweets.find(findQuery);
    } catch (err) {
      '--------  Error 1! ---------'
      console.log(err);
      const error = new HttpError(
        "Cannot find tweets for the user. Try again",
        500
      );
      return next(error);
    }

    if (!tweet || tweet.length === 0) {
      console.log('User hasnt interacted')
      interacted = false;
    } else {
      console.log('User has interacted!');
      interacted = true;
    }
    url = interacted ? removeApiUrl : apiUrl

    if (!oauth_token || !oauth_token_secret) {
      const error = new HttpError("Couldn't find secret or token!", 500);
      return next(error);
    }

    const token = {
      key: oauth_token,
      secret: oauth_token_secret,
    };

    const authHeader = oauth.toHeader(
      oauth.authorize(
        {
          url: url,
          method: "POST",
        },
        token
      )
    );

    let apiResult;
    let hasAlreadyInteracted = false;
    let hasAlreadyCanceled = false;
    try {
      apiResult = await got.post(url, {
        headers: {
          Authorization: authHeader["Authorization"],
        },
      }).json();
    } catch (err) {
      const apiError = JSON.parse(err.response.body)
      if (apiError.errors[0].code === 139 || apiError.errors[0].code === 327) {
        console.log('Db shows no interaction, but user interacted on twitter. Changing db status...')
        console.log(apiError)
        hasAlreadyInteracted = true;
      } else if (apiError.errors[0].code === 144) {
        console.log('Db shows interaction, but user not interacted on twitter. Changing db status...')
        console.log(apiError)
        hasAlreadyCanceled = true;
      }
      else {
        console.log('--------  Error 2! ---------')
        console.log(err.response.body)
        return next(err);
      }
    }


    let dbResult;
    try {
      const condition = { id: tweetid };
      dbResult = await Tweets.updateOne(condition, updateQuery);
    } catch (err) {
      console.log(err);
      const error = new HttpError("There was an error liking the tweet", 500);
      return next(error);
    }

    if (dbResult && (apiResult || hasAlreadyCanceled || hasAlreadyInteracted)) {
      res.json({ status: 200 });
    }
  };
};


const replyTweet = async (req, res, next) => {
  const tweetid = req.params.id;
  const url = `${process.env.TWITTER_API_V1}/favorites/create.json?id=${tweetid}`;

  let result;
  try {
    const condition = { id: tweetid };
    const updateQuery = [
      {
        $set: {
          replies: {
            $cond: [
              {
                $in: ["63c3e834042957cf3154f9c7", "$replies"],
              },
              {
                $setDifference: ["$replies", ["63c3e834042957cf3154f9c7"]],
              },
              {
                $concatArrays: ["$replies", ["63c3e834042957cf3154f9c7"]],
              },
            ],
          },
        },
      },
    ];
    result = await Tweets.updateOne(condition, updateQuery);
  } catch (err) {
    console.log(err);
    const error = new HttpError("There was an error liking the tweet", 500);
    return next(error);
  }
  res.json({ data: "Tweet replied!" });
};

const adminDeleteAll = async(req, res, next) => {
  const username = req.params.username
  let acc, tweets, users;
  console.log(username)
  try {
    // 1. Unfollow for any user
    const account = await Accounts.findOne({username: username})
    users = await User.updateMany({followed_author_ids: account.id},
    {
      $pull: {followed_author_ids: account.id, followed_ids: account._id}
    });
    // 2. Delete tweets
    tweets = await Tweets.deleteMany({username: username})
    // 3. Delete account
    acc = await Accounts.deleteOne({username: username})
  } catch(err) {
    const error = new HttpError('FUCK!')
    console.log(err)
    next(error)
  }

  if (users && tweets) {
    res.json({message: 'success!'})
  }
}

export default {
  fetchTweetsApi,
  checkLastUpdate,
  filterNewTweets,
  getTweets,
  getTweetsByUsername,
  interactionHandler,
  replyTweet,
  adminDeleteAll
};
