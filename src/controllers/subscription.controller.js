import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!channelId || channelId === "undefined" || channelId === "null") {
        throw new ApiError(400, "Valid channel ID or username is required")
    }

    const cleanChannelId = channelId.trim().replace(/^@/, "")

    let targetChannelId = cleanChannelId
    if (!isValidObjectId(cleanChannelId)) {
        const userObj = await User.findOne({ username: cleanChannelId.toLowerCase() })
        if (!userObj) {
            throw new ApiError(404, "Channel not found")
        }
        targetChannelId = userObj._id
    }

    if (targetChannelId.toString() === req.user._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel")
    }

    const channel = await User.findById(targetChannelId)
    if (!channel) {
        throw new ApiError(404, "Channel not found")
    }

    const subscription = await Subscription.findOne({ channel: targetChannelId, subscriber: req.user._id })
    if (subscription) {
        await Subscription.deleteOne({ _id: subscription._id })
        return res.status(200).json(new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully"))
    } else {
        await Subscription.create({ channel: targetChannelId, subscriber: req.user._id })
        return res.status(200).json(new ApiResponse(200, { subscribed: true }, "Subscribed successfully"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    if (!channelId || channelId === "undefined" || channelId === "null") {
        return res.status(200).json(new ApiResponse(200, [], "Valid channel ID required"))
    }

    const cleanChannelId = channelId.trim().replace(/^@/, "")

    let targetChannelId = cleanChannelId
    if (!isValidObjectId(cleanChannelId)) {
        const userObj = await User.findOne({ username: cleanChannelId.toLowerCase() })
        if (!userObj) {
            return res.status(200).json(new ApiResponse(200, [], "Channel not found"))
        }
        targetChannelId = userObj._id
    }
    const subscribers = await Subscription.find({ channel: targetChannelId }).populate("subscriber", "username fullName avatar")
    return res.status(200).json(new ApiResponse(200, subscribers, "Subscriber list fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    let { subscriberId } = req.params
    if (!subscriberId && req.user?._id) {
        subscriberId = req.user._id.toString()
    }
    if (!subscriberId || subscriberId === "undefined" || subscriberId === "null") {
        return res.status(200).json(new ApiResponse(200, [], "Subscriber ID required"))
    }

    const cleanSubId = subscriberId.trim().replace(/^@/, "")

    let targetSubId = cleanSubId
    if (!isValidObjectId(cleanSubId)) {
        const userObj = await User.findOne({ username: cleanSubId.toLowerCase() })
        if (!userObj) {
            return res.status(200).json(new ApiResponse(200, [], "User not found"))
        }
        targetSubId = userObj._id
    }
    const channels = await Subscription.find({ subscriber: targetSubId }).populate("channel", "username fullName avatar coverImage")
    return res.status(200).json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}