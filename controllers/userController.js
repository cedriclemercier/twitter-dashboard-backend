import User from '../models/user.js';
import Account from '../models/account.js';
import HttpError from "../models/http-error.js";

const getAccountsFollowedByUserId = async (req, res, next) => {
  const userId = req.query.userId
  if (!userId || userId == "false") {
    console.log('user id is false!')
    return next();
  }
  console.log(userId)

  let userWithAccounts;
  try {
    userWithAccounts = await User.findById(userId).populate('followed_ids');
  } catch (err) {
    console.log(err)
    const error = new HttpError(
      "Cannot find accounts for the user. Try again",
      500
    );
    return next(error);
  }

  if (!userWithAccounts || userWithAccounts.length === 0) {
    return next(
      new Error("Could not find accounts for the provided user id"),
      404
    );
  }

  res.json({
    followed_ids: userWithAccounts.followed_ids.map((followed) =>
      followed.toObject({ getters: true })
    ),
  });
};

const getUserDetails = async (req, res, next) => {
  const userId = req.query.userId
  if (!userId || userId == "false") {
    console.log('user id is false!')
    return next();
  }
  console.log(userId)

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    console.log(err)
    const error = new HttpError(
      "Cannot find accounts for the user. Try again",
      500
    );
    return next(error);
  }

  if (!user || user.length === 0) {
    return next(
      new Error("Could not find accounts for the provided user id"),
      404
    );
  }

  res.json(user);
}

const followAccount = async (req, res, next) => {
  const userId = res.locals.userId
  const account = res.locals.account;

  let result;
  try {
    result = await User.updateOne(
      {_id: userId},
      {$push: {followed_ids: account._id, followed_author_ids: account.id}}
      )
  } catch(err) {
    const error = new HttpError("Couldn't follow account. Please try again later!")
    console.log(err)
    next(error)
  }

  if (result) {
    res.json({ message: 'Success!', statusCode: 200 })
  }
}

export default { getUserDetails, getAccountsFollowedByUserId, followAccount };
