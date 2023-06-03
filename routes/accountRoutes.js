import express from 'express';

import accountController from '../controllers/accountController.js';
import tweetController from '../controllers/tweetController.js';
import userController from '../controllers/userController.js';


const router = express.Router();

router.get('/:username', accountController.fetchAccountDetails)
router.post('/follow', accountController.saveAccount, userController.followAccount)
router.post('/save/:username', accountController.fetchAccountDetailsV2, tweetController.fetchTweetsApi, tweetController.filterNewTweets, (req, res) => res.redirect('/'))

export default router;