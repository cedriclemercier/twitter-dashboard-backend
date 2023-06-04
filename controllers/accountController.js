import "dotenv/config";
import got from "got";
import qs from 'qs';
import moment from 'moment';

import Accounts from "../models/account.js";
import oauth from "../config/oauth.js";
import HttpError from "../models/http-error.js";
import Tweets from "../models/tweet.js";
import User from "../models/user.js";

const saveAccToDb = async (obj) => {
    let res;
    try {
        res = await Accounts.find({ id: obj.id })
    } catch (err) {
        const error = new HttpError('Error in finding account', 500)
        next(error)
    }

    let newAcc;

    if (!res || res.length === 0) {
        console.log('Record doesnt exist. Inserting...', obj.name)
        obj.last_updated = moment().toISOString()
        try {
            newAcc = new Accounts(obj).save()
        } catch (err) {
            console.log('Failed saving!')
        }
    } else {
        console.log('Already exists!')
        newAcc = res;
    }

    return newAcc;
}

const fetchAccountDetails = async (req, res, next) => {
    const { oauth_token, oauth_token_secret } = req.query; // to req.body
    const username = req.params.username;

    // TO CHANGE!!!!!!!!!!!!!!!!!!!!======================================
    if (!oauth_token || !oauth_token_secret) {
        const error = new HttpError("Couldn't find secret or token!", 500);
        return next(error);
    }
    const token = {
        key: oauth_token,
        secret: oauth_token_secret
    };

    console.log(token)

    let queryParams = {
        'user.fields': 'created_at,description,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,verified_type,withheld',
    }
    queryParams = qs.stringify(queryParams, { encode: false })
    const url = `https://api.twitter.com/2/users/by?usernames=${username}&${queryParams}`;
    const authHeader = oauth.toHeader(oauth.authorize({ url: url, method: "get", }, token));

    let apiResult;
    try {
        apiResult = await got.get(url, { headers: { Authorization: authHeader["Authorization"], }, }).json();
    } catch (err) {
        if (err.response.body) console.log(JSON.parse(err.response.body))
        else console.log(err)
        // const error = new HttpError('Cant retrieve account details!', 500)
        next(err)
    }

    if (apiResult.data) {
        console.log(apiResult);
        res.json({'user': apiResult.data[0]})
    }

    if (apiResult.errors) {
        console.log('error')
        console.log(apiResult.errors)
        res.json({'error': "No result found for username."})
    }
}

const fetchAccountDetailsV2 = async (req, res, next) => {
    const { oauth_token, oauth_token_secret } = req.query; // to req.body
    const username = req.params.username;

    // TO CHANGE!!!!!!!!!!!!!!!!!!!!======================================
    if (!oauth_token || !oauth_token_secret) {
        const error = new HttpError("Couldn't find secret or token!", 500);
        return next(error);
    }
    const token = {
        key: oauth_token,
        secret: oauth_token_secret
    };

    console.log(token)

    let queryParams = {
        'user.fields': 'created_at,description,id,location,name,pinned_tweet_id,profile_image_url,protected,public_metrics,url,username,verified,verified_type,withheld',
    }
    queryParams = qs.stringify(queryParams, { encode: false })
    const url = `https://api.twitter.com/2/users/by?usernames=${username}&${queryParams}`;
    const authHeader = oauth.toHeader(oauth.authorize({ url: url, method: "get", }, token));

    let apiResult;
    try {
        apiResult = await got.get(url, { headers: { Authorization: authHeader["Authorization"], }, }).json();
    } catch (err) {
        if (err.response.body) console.log(JSON.parse(err.response.body))
        else console.log(err)
        // const error = new HttpError('Cant retrieve account details!', 500)
        next(err)
    }
    console.log(apiResult)
    console.log(apiResult.data[0])

    const result = await saveAccToDb(apiResult.data[0]);

    if (result) {
        console.log('settings vars')
        res.locals.ids = [result.id]
        res.locals.oauth_token = oauth_token;
        res.locals.oauth_token_secret = oauth_token_secret
        next()
        // res.json({ code: 'success', statusCode: 200 })
    }
    else {
        const error = new HttpError("Failed saving the document", 500);
        return next(error);
    }
}

const saveAccount = async (req, res, next) => {
    console.log('Saving account')
    console.log(req.body)
    const user = req.body.user
    let result;
    try {
        const account = new Accounts(user)
        account.last_updated = moment().subtract(2, 'years').toISOString()
        result = await account.save()
    } catch (err) {
        const error = new HttpError("There was a problem following that account!")
        console.log(err)
        next(error)
    }

    if (result) {
        console.log('saved!' + user.name)
        console.log(result)

        res.locals.account = { id: result.id, _id: result._id }
        res.locals.userId = req.body.userId
    }
    next()
    // res.locals.user = {id: user.id, _id: result.}
    // res.json({ message: 'Success!', statusCode: 200 })
}


export default { fetchAccountDetails, fetchAccountDetailsV2, saveAccount }