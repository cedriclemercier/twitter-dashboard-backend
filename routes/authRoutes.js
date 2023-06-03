import express from 'express';

import authController from '../controllers/authController.js';


const router = express.Router();


router.get('/', authController.login)
router.get('/callback', authController.callback)

export default router;