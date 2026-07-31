import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }
    const tweet = await Tweet.create({ content, owner: req.user._id })
    const populatedTweet = await Tweet.findById(tweet._id).populate("owner", "username fullName avatar")
    return res.status(201).json(new ApiResponse(201, populatedTweet, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params
    let targetUserId = userId
    if (!isValidObjectId(userId)) {
        const userObj = await User.findOne({ username: userId.toLowerCase() })
        if (!userObj) {
            return res.status(200).json(new ApiResponse(200, [], "User tweets fetched successfully"))
        }
        targetUserId = userObj._id
    }
    const tweets = await Tweet.find({ owner: targetUserId }).populate("owner", "username fullName avatar").sort({ createdAt: -1 })

    const tweetsWithLikes = await Promise.all(
        tweets.map(async (tweet) => {
            const likesCount = await Like.countDocuments({ tweet: tweet._id })
            const isLiked = req.user
                ? !!(await Like.findOne({ tweet: tweet._id, likedBy: req.user._id }))
                : false
            const tweetData = tweet.toObject()
            tweetData.likesCount = likesCount
            tweetData.isLiked = isLiked
            return tweetData
        })
    )

    return res.status(200).json(new ApiResponse(200, tweetsWithLikes, "User tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params
    const { content } = req.body
    const tweet = await Tweet.findOneAndUpdate({ _id: tweetId, owner: req.user._id }, { content }, { new: true })
    if (!tweet) {
        throw new ApiError(404, "Tweet not found or you are not the owner of the tweet")
    }
    return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params
    const tweet = await Tweet.findOneAndDelete({ _id: tweetId, owner: req.user._id })
    if (!tweet) {
        throw new ApiError(404, "Tweet not found or you are not the owner of the tweet")
    }
    return res.status(200).json(new ApiResponse(200, null, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}