import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.user._id

    const totalVideos = await Video.countDocuments({ owner: channelId })
    const totalSubscribers = await Subscription.countDocuments({ channel: channelId })

    // Aggregate total views across all videos owned by channel
    const videoViewsAggregate = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ])

    const totalViews = videoViewsAggregate[0]?.totalViews || 0

    // Aggregate total likes across all videos owned by channel
    const videoIds = await Video.find({ owner: channelId }).distinct("_id")
    const totalLikes = await Like.countDocuments({ video: { $in: videoIds } })

    return res.status(200).json(
        new ApiResponse(200, { totalVideos, totalSubscribers, totalViews, totalLikes }, "Channel stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = req.user._id
    const videos = await Video.find({ owner: channelId }).sort({ createdAt: -1 })

    const videosWithLikes = await Promise.all(
        videos.map(async (vid) => {
            const likesCount = await Like.countDocuments({ video: vid._id })
            const vidObj = vid.toObject()
            vidObj.likesCount = likesCount
            return vidObj
        })
    )

    return res.status(200).json(new ApiResponse(200, videosWithLikes, "Channel videos fetched successfully"))
})

export {
    getChannelStats,
    getChannelVideos
}