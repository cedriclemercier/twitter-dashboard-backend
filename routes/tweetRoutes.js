import express from 'express';

import tweetController from '../controllers/tweetController.js';


const router = express.Router();


router.get('/', tweetController.checkLastUpdate, tweetController.getTweets)
router.post('/', tweetController.fetchTweetsApi, tweetController.filterNewTweets, tweetController.getTweetsByUsername)
router.get('/account/:username', tweetController.getTweetsByUsername)
router.delete('/account/:username', tweetController.adminDeleteAll)

router.post('/:id/like', tweetController.interactionHandler('like'))
router.post('/:id/rt', tweetController.interactionHandler('retweet'))
router.post('/:id/reply', tweetController.replyTweet)

export default router;