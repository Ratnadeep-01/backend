import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import { verifyJWT, verifyJWTOptional } from "../middlewares/auth.middleware.js"

const router = Router();

router
    .route("/c/:channelId")
    .get(verifyJWTOptional, getUserChannelSubscribers)
    .post(verifyJWT, toggleSubscription);

router.route("/u/:subscriberId").get(verifyJWTOptional, getSubscribedChannels);

export default router