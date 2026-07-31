import mongoose from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id })
    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new ApiResponse(200, { isLiked: false }, "Like removed"))
    } else {
        await Like.create({ video: videoId, likedBy: req.user._id })
        return res.status(200).json(new ApiResponse(200, { isLiked: true }, "Like added"))
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id })
    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new ApiResponse(200, { isLiked: false }, "Comment like removed"))
    } else {
        await Like.create({ comment: commentId, likedBy: req.user._id })
        return res.status(200).json(new ApiResponse(200, { isLiked: true }, "Comment like added"))
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: req.user._id })
    if (existingLike) {
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new ApiResponse(200, { isLiked: false }, "Tweet like removed"))
    } else {
        await Like.create({ tweet: tweetId, likedBy: req.user._id })
        return res.status(200).json(new ApiResponse(200, { isLiked: true }, "Tweet like added"))
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const likedDoc = await Like.find({ likedBy: req.user._id, video: { $ne: null } }).populate({
        path: "video",
        populate: {
            path: "owner",
            select: "username fullName avatar"
        }
    })

    const likedVideos = await Promise.all(
        likedDoc
            .map((item) => item.video)
            .filter(Boolean)
            .map(async (vid) => {
                const likesCount = await Like.countDocuments({ video: vid._id })
                const vidObj = vid.toObject ? vid.toObject() : vid
                vidObj.likesCount = likesCount
                vidObj.isLiked = true
                return vidObj
            })
    )

    return res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}