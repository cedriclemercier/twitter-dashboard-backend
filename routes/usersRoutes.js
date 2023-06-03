import express from 'express';

import userController from '../controllers/userController.js';


const router = express.Router();


router.get('/', userController.getUserDetails)
router.get('/accounts', userController.getAccountsFollowedByUserId)

export default router;