import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const extractToken = (req) => {
    if (req.cookies?.accessToken) return req.cookies.accessToken;
    const authHeader = req.header("Authorization") || req.header("authorization") || req.headers?.authorization;
    if (authHeader) {
        return authHeader.replace(/^Bearer\s+/i, "").trim();
    }
    return null;
};

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            throw new ApiError(401, "unauthorised access");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-refreshToken");

        if (!user) {
            throw new ApiError(401, "invalid token address");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token");
    }
});

export const verifyJWTOptional = asyncHandler(async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (token) {
            const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decodedToken?._id).select("-refreshToken");
            if (user) {
                req.user = user;
            }
        }
    } catch (error) {
        // Silently ignore token errors for optional auth
    }
    next();
});
