import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changePassword, getCurrentUser, updateUserProfile, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory, clearWatchHistory } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT, verifyJWTOptional } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createUserSchema, loginUserSchema } from "../validators/auth.validator.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1 
        },
    ]),
    validate(createUserSchema), 
    registerUser
);

router.route("/login").post(validate(loginUserSchema),loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").get(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-profile").patch(verifyJWT, updateUserProfile)
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/c/:username").get(verifyJWTOptional, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory).delete(verifyJWT, clearWatchHistory)

export default router;
